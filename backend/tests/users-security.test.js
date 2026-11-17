const { Lock, IDS, TEST_PASSWORD, userFixture, mockDatabase, duplicateError } = require("./helpers/mock-database");
const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const service = require("../src/modules/users/user.service");
const { withUserMutationLock } = require("../src/modules/users/user-mutation-lock");

test("Admin cuối cùng không được tự hạ quyền; Admin bị khóa/xóa không được tính", async (t) => {
  const state = mockDatabase(t, [userFixture(), userFixture(IDS.second, { status: "locked" }),
    userFixture(IDS.manager, { isDeleted: true })]);
  await assert.rejects(service.updateUser(IDS.admin, { role: "employee" }, IDS.admin), { code: "LAST_ACTIVE_ADMIN", statusCode: 409 });
  assert.equal(state.activeAdmins(), 1);
  assert.equal(state.writes, 0);
  assert.equal(state.lock, null);
});

test("được hạ quyền một Admin khi vẫn còn Admin khác", async (t) => {
  const state = mockDatabase(t, [userFixture(), userFixture(IDS.second)]);
  const result = await service.updateUser(IDS.admin, { role: "manager" }, IDS.admin);
  assert.equal(result.role, "manager");
  assert.equal(state.activeAdmins(), 1);
});

test("hai Admin tự hạ quyền đồng thời vẫn giữ lại một Admin", async (t) => {
  const state = mockDatabase(t, [userFixture(), userFixture(IDS.second)]);
  // Hai instance service riêng, dùng cùng kho dữ liệu và khóa MongoDB giả.
  const otherService = new service.constructor();
  const results = await Promise.allSettled([
    service.updateUser(IDS.admin, { role: "employee" }, IDS.admin),
    otherService.updateUser(IDS.second, { role: "employee" }, IDS.second),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.code, "LAST_ACTIVE_ADMIN");
  assert.equal(state.activeAdmins(), 1);
  assert.ok(state.lockAttempts > 2);
  assert.equal(state.lock, null);
});

for (const action of ["lock", "delete", "mixed"]) {
  test(`hai Admin thao tác chéo đồng thời: ${action}`, async (t) => {
    const state = mockDatabase(t, [userFixture(), userFixture(IDS.second)]);
    const first = action === "delete" ? service.deleteUser(IDS.second, IDS.admin)
      : service.updateUserStatus(IDS.second, "locked", IDS.admin);
    const second = action === "lock" ? service.updateUserStatus(IDS.admin, "locked", IDS.second)
      : service.deleteUser(IDS.admin, IDS.second);
    const results = await Promise.allSettled([first, second]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.find((result) => result.status === "rejected").reason.statusCode, 403);
    assert.equal(state.activeAdmins(), 1);
    assert.equal(state.lock, null);
  });
}

test("ObjectId viết hoa không vượt kiểm tra tự khóa, ngừng hoạt động, mở khóa hoặc xóa", async (t) => {
  const state = mockDatabase(t, [userFixture()]);
  for (const status of ["locked", "inactive", "active"]) {
    await assert.rejects(service.updateUserStatus(IDS.admin.toUpperCase(), status, IDS.admin), { statusCode: 400 });
  }
  await assert.rejects(service.deleteUser(IDS.admin.toUpperCase(), IDS.admin), { statusCode: 400 });
  assert.equal(state.lockAttempts, 0);
  assert.equal(state.writes, 0);
});

test("sửa hồ sơ Admin cuối cùng không bị chặn và không đổi tokenVersion", async (t) => {
  const state = mockDatabase(t, [userFixture(IDS.admin, { tokenVersion: 3 })]);
  const result = await service.updateUser(IDS.admin, { fullName: "Tên đã sửa" }, IDS.admin);
  assert.equal(result.fullName, "Tên đã sửa");
  assert.equal(state.records.get(IDS.admin).tokenVersion, 3);
  assert.equal(result.password, undefined);
  assert.equal(result.tokenVersion, undefined);
});

test("khóa/mở khóa/xóa mềm nhân viên hoạt động bình thường", async (t) => {
  const state = mockDatabase(t, [userFixture(), userFixture(IDS.employee, { role: "employee" })]);
  assert.equal((await service.updateUserStatus(IDS.employee, "locked", IDS.admin)).status, "locked");
  assert.equal((await service.updateUserStatus(IDS.employee, "active", IDS.admin)).status, "active");
  await service.deleteUser(IDS.employee, IDS.admin);
  assert.equal(state.records.get(IDS.employee).isDeleted, true);
  assert.equal(state.records.get(IDS.employee).status, "inactive");
  await assert.rejects(service.getUserById(IDS.employee), { statusCode: 404 });
});

test("đọc Users phân trang, lọc, ẩn hash và version; chặn phân trang vô hạn", async (t) => {
  mockDatabase(t, [userFixture(), userFixture(IDS.employee, { role: "employee", tokenVersion: 5 })]);
  const result = await service.getUsers({ role: "employee", page: 1, limit: 10 });
  assert.equal(result.users.length, 1);
  assert.equal(result.pagination.total, 1);
  assert.equal(result.users[0].password, undefined);
  assert.equal(result.users[0].tokenVersion, undefined);
  const detail = await service.getUserById(IDS.employee.toUpperCase());
  assert.equal(detail.password, undefined);
  await assert.rejects(service.getUsers({ page: "9".repeat(310) }));
  await assert.rejects(service.getUserById("invalid"), { statusCode: 400 });
});

test("tạo tài khoản hash mật khẩu, bật cờ đổi mật khẩu và giữ response cũ", async (t) => {
  const state = mockDatabase(t, [userFixture()]);
  const user = await service.createUser({ employeeCode: " new01 ", fullName: "Người dùng mới", email: " NEW@EXAMPLE.INVALID ",
    password: TEST_PASSWORD, role: "employee" }, IDS.admin);
  assert.equal(user.employeeCode, "NEW01");
  assert.equal(user.email, "new@example.invalid");
  assert.equal(user.mustChangePassword, true);
  assert.equal(user.password, undefined);
  assert.equal(user.tokenVersion, undefined);
  assert.equal(await bcrypt.compare(TEST_PASSWORD, state.records.get(String(user._id)).password), true);
});

test("email hoặc mã trùng khi cập nhật phát sinh 11000 và giải phóng khóa", async (t) => {
  const fixture = userFixture(IDS.employee, { role: "employee" });
  const state = mockDatabase(t, [userFixture(), fixture]);
  await assert.rejects(service.updateUser(IDS.admin, { email: fixture.email }, IDS.admin), { code: 11000 });
  await assert.rejects(service.updateUser(IDS.admin, { employeeCode: fixture.employeeCode }, IDS.admin), { code: 11000 });
  assert.equal(state.lock, null);
});

test("hai yêu cầu tạo cùng tài khoản đồng thời chỉ tạo một bản ghi", async (t) => {
  const state = mockDatabase(t, [userFixture()]);
  const payload = { employeeCode: "CONCURRENT-NEW", fullName: "Người dùng mới", email: "concurrent@example.invalid",
    password: TEST_PASSWORD, role: "employee" };
  const results = await Promise.allSettled([
    service.createUser(payload, IDS.admin), service.createUser(payload, IDS.admin),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.statusCode, 409);
  assert.equal(state.records.size, 2);
  assert.equal(state.lock, null);
});

test("người thao tác mất quyền hoặc chưa đổi mật khẩu không được ghi", async (t) => {
  const state = mockDatabase(t, [userFixture(), userFixture(IDS.manager, { role: "manager" }),
    userFixture(IDS.second, { mustChangePassword: true })]);
  await assert.rejects(service.updateUser(IDS.admin, { fullName: "Tên mới" }, IDS.manager), { statusCode: 403 });
  await assert.rejects(service.updateUser(IDS.admin, { fullName: "Tên mới" }, IDS.second), { code: "PASSWORD_CHANGE_REQUIRED" });
  assert.equal(state.writes, 0);
});

test("khóa bận trả 503, không tự cướp khóa hoặc ghi dữ liệu", async (t) => {
  const state = mockDatabase(t, []);
  state.lock = { _id: "users-mutations", owner: "previous-process", acquiredAt: new Date(0) };
  await assert.rejects(withUserMutationLock(() => assert.fail("Không được chạy thao tác"), { timeoutMs: 0 }),
    { code: "USER_MUTATION_BUSY", statusCode: 503 });
  assert.equal(state.lock.owner, "previous-process");
});

test("lỗi nghiệp vụ và lỗi ghi xác định không giữ khóa vô ích", async (t) => {
  const state = mockDatabase(t, []);
  await assert.rejects(withUserMutationLock(() => { throw new Error("validation-before-write"); }));
  assert.equal(state.lock, null);
  await assert.rejects(withUserMutationLock((write) => write(async () => { throw duplicateError("email"); })), { code: 11000 });
  assert.equal(state.lock, null);
});

test("mất phản hồi sau khi ghi: giữ khóa, không chạy thao tác tiếp theo", async (t) => {
  t.mock.method(console, "error", () => {});
  const state = mockDatabase(t, [userFixture(), userFixture(IDS.second)]);
  state.writeFailure = Object.assign(new Error("lost-acknowledgement"), { name: "MongoNetworkError" });
  state.applyThenFail = true;
  await assert.rejects(service.updateUser(IDS.admin, { role: "employee" }, IDS.admin), { code: "USER_WRITE_UNCERTAIN" });
  assert.equal(state.activeAdmins(), 1);
  assert.ok(state.lock);
  await assert.rejects(withUserMutationLock(() => assert.fail("Không được ghi tiếp"), { timeoutMs: 0 }),
    { code: "USER_MUTATION_BUSY" });
});

test("lỗi giải phóng khóa được báo rõ", async (t) => {
  t.mock.method(console, "error", () => {});
  const state = mockDatabase(t, []);
  state.lockReleaseFailure = new Error("network-error");
  await assert.rejects(withUserMutationLock(async () => "done"), { code: "USER_LOCK_RELEASE_FAILED" });
  assert.ok(state.lock);
});

test("không xóa khóa có owner khác", async (t) => {
  t.mock.method(console, "error", () => {});
  const state = mockDatabase(t, []);
  await assert.rejects(withUserMutationLock(async () => { state.lock.owner = "different-owner"; }),
    { code: "USER_LOCK_RELEASE_FAILED" });
  assert.equal(state.lock.owner, "different-owner");
});

test("không lấy được khóa thì không được chạy thao tác ghi Users", async (t) => {
  t.mock.method(console, "error", () => {});
  mockDatabase(t, []);
  t.mock.method(Lock.collection, "insertOne", async () => { throw new Error("network-error"); });
  await assert.rejects(withUserMutationLock(() => assert.fail("Không được ghi khi chưa có khóa")),
    { code: "USER_LOCK_UNAVAILABLE", statusCode: 503 });
});

test("phản hồi ghi không được xác nhận cũng phải giữ khóa", async (t) => {
  t.mock.method(console, "error", () => {});
  const state = mockDatabase(t, []);
  await assert.rejects(withUserMutationLock((write) => write(async () => ({ acknowledged: false }))),
    { code: "USER_WRITE_UNCERTAIN" });
  assert.ok(state.lock);
});

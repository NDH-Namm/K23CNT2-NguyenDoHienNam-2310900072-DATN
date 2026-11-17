const { User, IDS, TEST_PASSWORD, userFixture, mockDatabase } = require("./helpers/mock-database");
const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authenticate = require("../src/middlewares/auth.middleware");
const authorizeRoles = require("../src/middlewares/role.middleware");
const requirePasswordChanged = require("../src/middlewares/password-change.middleware");
const { generateAccessToken, verifyAccessToken } = require("../src/utils/jwt");
const authService = require("../src/modules/auth/auth.service");

const sign = (payload, options = {}) => jwt.sign({ id: IDS.admin, role: "admin", ...payload },
  process.env.JWT_SECRET, { expiresIn: "1h", ...options });

const authorize = async (token) => {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const result = { status: 200, next: false, req };
  await authenticate(req, { status(code) { result.status = code; return this; }, json(body) { result.body = body; } },
    (error) => { if (error) throw error; result.next = true; });
  return result;
};

test("schema tương thích document cũ và không serialize hash/tokenVersion", () => {
  const user = User.hydrate(userFixture());
  assert.equal(user.tokenVersion, 0);
  assert.equal(user.isModified(), false);
  assert.equal(user.toObject().password, undefined);
  assert.equal(user.toJSON().tokenVersion, undefined);
  const payload = verifyAccessToken(generateAccessToken(user));
  assert.equal(payload.tokenVersion, 0);
});

test("JWT cũ không có tokenVersion được chấp nhận ở tài khoản phiên bản 0", async (t) => {
  mockDatabase(t, [userFixture()]);
  assert.equal((await authorize(sign({}))).next, true);
  assert.equal((await authorize(sign({ tokenVersion: 0 }))).next, true);
});

test("JWT cũ phát trước passwordChangedAt yêu cầu đăng nhập lại", async (t) => {
  mockDatabase(t, [userFixture(IDS.admin, { passwordChangedAt: new Date() })]);
  assert.equal((await authorize(sign({ iat: Math.floor(Date.now() / 1000) - 60 }))).status, 401);
  assert.equal((await authorize(sign({ tokenVersion: 0 }))).next, true);
});

test("JWT thiếu, sai chữ ký, hết hạn, nbf tương lai, ID sai và thuật toán sai đều bị chặn", async (t) => {
  mockDatabase(t, [userFixture()]);
  const tokens = [undefined, "invalid-token", sign({}, { expiresIn: -1 }),
    sign({}, { notBefore: "1h" }), sign({ id: "invalid" }), sign({}, { algorithm: "HS384" }),
    jwt.sign({ id: IDS.admin }, "another-test-secret"), jwt.sign("text-payload", process.env.JWT_SECRET)];
  for (const token of tokens) assert.equal((await authorize(token)).status, 401);
});

test("tokenVersion sai kiểu, âm hoặc khác database không được chấp nhận", async (t) => {
  mockDatabase(t, [userFixture(IDS.admin, { tokenVersion: 2 })]);
  for (const tokenVersion of [undefined, 0, 1, 3, -1, "2", null, 1.5]) {
    assert.equal((await authorize(sign({ tokenVersion }))).status, 401);
  }
  assert.equal((await authorize(sign({ tokenVersion: 2 }))).next, true);
});

test("vai trò hiện tại trong database quyết định RBAC", async (t) => {
  mockDatabase(t, [userFixture(IDS.admin, { role: "employee" })]);
  const result = await authorize(sign({ role: "admin", tokenVersion: 0 }));
  let status;
  authorizeRoles("admin")(result.req, { status(value) { status = value; return this; }, json() {} },
    () => assert.fail("Không được giữ quyền Admin từ JWT cũ"));
  assert.equal(status, 403);
});

for (const state of [{ status: "locked" }, { status: "inactive" }, { isDeleted: true }]) {
  test(`tài khoản không hoạt động bị từ chối: ${JSON.stringify(state)}`, async (t) => {
    mockDatabase(t, [userFixture(IDS.admin, state)]);
    assert.equal((await authorize(sign({ tokenVersion: 0 }))).status, 401);
  });
}

test("middleware bắt buộc đổi mật khẩu chỉ cho phép cờ false", () => {
  for (const mustChangePassword of [true, undefined]) {
    let status;
    let body;
    requirePasswordChanged({ user: { mustChangePassword } }, {
      status(value) { status = value; return this; }, json(value) { body = value; },
    }, () => assert.fail("Chưa đổi mật khẩu không được vào nghiệp vụ"));
    assert.equal(status, 403);
    assert.equal(body.code, "PASSWORD_CHANGE_REQUIRED");
  }
  let next = false;
  requirePasswordChanged({ user: { mustChangePassword: false } }, {}, () => { next = true; });
  assert.equal(next, true);
});

test("đổi mật khẩu tài khoản cũ tăng version nguyên tử và thu hồi mọi token cũ", async (t) => {
  const state = mockDatabase(t, [userFixture(IDS.admin, { mustChangePassword: true })]);
  const legacy = sign({});
  const old = sign({ tokenVersion: 0 });
  const result = await authService.changePassword(IDS.admin, TEST_PASSWORD, "NewPassword123!", 0);
  assert.match(result.message, /thành công/);
  const stored = state.records.get(IDS.admin);
  assert.equal(stored.tokenVersion, 1);
  assert.equal(stored.mustChangePassword, false);
  assert.ok(stored.passwordChangedAt instanceof Date);
  assert.equal(await bcrypt.compare("NewPassword123!", stored.password), true);
  assert.equal((await authorize(legacy)).status, 401);
  assert.equal((await authorize(old)).status, 401);
  const login = await authService.login(stored.email, "NewPassword123!");
  assert.equal(verifyAccessToken(login.accessToken).tokenVersion, 1);
  assert.equal((await authorize(login.accessToken)).next, true);
  assert.equal(login.user.password, undefined);
  assert.equal(login.user.tokenVersion, undefined);
});

test("hai yêu cầu đổi mật khẩu đồng thời không ghi đè nhau", async (t) => {
  const state = mockDatabase(t, [userFixture()]);
  const results = await Promise.allSettled([
    authService.changePassword(IDS.admin, TEST_PASSWORD, "FirstPassword123!", 0),
    authService.changePassword(IDS.admin, TEST_PASSWORD, "SecondPassword123!", 0),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.statusCode, 409);
  assert.equal(state.records.get(IDS.admin).tokenVersion, 1);
});

test("mật khẩu hiện tại sai, mật khẩu không đổi và phiên bản cũ không được ghi", async (t) => {
  const state = mockDatabase(t, [userFixture()]);
  await assert.rejects(authService.changePassword(IDS.admin, "WrongPassword123!", "NewPassword123!", 0), { statusCode: 400 });
  await assert.rejects(authService.changePassword(IDS.admin, TEST_PASSWORD, TEST_PASSWORD, 0), { statusCode: 400 });
  await assert.rejects(authService.changePassword(IDS.admin, TEST_PASSWORD, "NewPassword123!", 5), { statusCode: 401 });
  assert.equal(state.writes, 0);
});

test("tài khoản dùng mật khẩu cũ dài vẫn đăng nhập và đổi được mật khẩu", async (t) => {
  const old = "á".repeat(50);
  const fixture = userFixture(IDS.admin, { password: bcrypt.hashSync(old, 4) });
  const state = mockDatabase(t, [fixture]);
  assert.ok((await authService.login(fixture.email, old)).accessToken);
  await authService.changePassword(IDS.admin, old, "NewPassword123!", 0);
  assert.equal(state.records.get(IDS.admin).tokenVersion, 1);
});

test("sai mật khẩu không tiết lộ tài khoản bị khóa", async (t) => {
  const fixture = userFixture(IDS.admin, { status: "locked" });
  mockDatabase(t, [fixture]);
  await assert.rejects(authService.login(fixture.email, "WrongPassword123!"), { statusCode: 401 });
  await assert.rejects(authService.login(fixture.email, TEST_PASSWORD), { statusCode: 403 });
});

const { IDS, TEST_PASSWORD, userFixture, mockDatabase } = require("./helpers/mock-database");
const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const app = require("../src/app");
const { generateAccessToken } = require("../src/utils/jwt");

const startApi = async (t) => {
  // Chỉ mở HTTP loopback; app.js không khởi động/kết nối MongoDB.
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  return async (method, path, token, body, raw = false) => {
    const response = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: raw ? body : JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
};

test("ma trận HTTP Users: bốn vai trò và sáu endpoint", async (t) => {
  t.mock.method(console, "error", () => {});
  const fixtures = [userFixture(), userFixture(IDS.manager, { role: "manager" }),
    userFixture(IDS.warehouse, { role: "warehouse" }), userFixture(IDS.employee, { role: "employee" }),
    userFixture(IDS.second, { role: "employee" })];
  mockDatabase(t, fixtures);
  const request = await startApi(t);
  const payload = { employeeCode: "HTTP-NEW", fullName: "Tài khoản HTTP", email: "http-new@example.invalid",
    password: TEST_PASSWORD, role: "employee" };
  const endpoints = [
    ["GET", "/users", undefined, true, 200],
    ["GET", `/users/${IDS.second}`, undefined, true, 200],
    ["POST", "/users", payload, false, 201],
    ["PATCH", `/users/${IDS.second}`, { fullName: "Tên đã sửa" }, false, 200],
    ["PATCH", `/users/${IDS.second}/status`, { status: "locked" }, false, 200],
    ["DELETE", `/users/${IDS.second}`, undefined, false, 200],
  ];
  for (const [method, path, body, read, successStatus] of endpoints) {
    assert.equal((await request(method, path, undefined, body)).status, 401);
    for (const fixture of fixtures.slice(0, 4)) {
      const response = await request(method, path, generateAccessToken(fixture), body);
      const allowed = fixture.role === "admin" || (read && fixture.role === "manager");
      assert.equal(response.status, allowed ? successStatus : 403, `${fixture.role}: ${method} ${path}`);
      assert.equal(JSON.stringify(response.body).includes("$2b$"), false);
    }
  }
});

test("HTTP: bắt buộc đổi mật khẩu nhưng vẫn dùng được login/me/change-password", async (t) => {
  t.mock.method(console, "error", () => {});
  const fixture = userFixture(IDS.admin, { mustChangePassword: true });
  mockDatabase(t, [fixture]);
  const request = await startApi(t);
  const login = await request("POST", "/auth/login", undefined, { email: fixture.email, password: TEST_PASSWORD });
  assert.equal(login.status, 200);
  const token = login.body.data.accessToken;
  const me = await request("GET", "/auth/me", token);
  assert.equal(me.status, 200);
  assert.equal(me.body.data.user.mustChangePassword, true);
  assert.equal(me.body.data.user.tokenVersion, undefined);
  assert.equal(me.body.data.user.password, undefined);
  const blocked = await request("GET", "/users", token);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, "PASSWORD_CHANGE_REQUIRED");
  assert.equal((await request("PATCH", "/auth/change-password", token,
    { currentPassword: TEST_PASSWORD, newPassword: "NewPassword123!" })).status, 200);
  assert.equal((await request("GET", "/auth/me", token)).status, 401);
  const fresh = await request("POST", "/auth/login", undefined, { email: fixture.email, password: "NewPassword123!" });
  assert.equal(fresh.status, 200);
  assert.equal((await request("GET", "/users", fresh.body.data.accessToken)).status, 200);
});

test("HTTP: dữ liệu trùng trả 409, phân trang sai trả 400, ID không tồn tại trả 404", async (t) => {
  t.mock.method(console, "error", () => {});
  const fixture = userFixture();
  mockDatabase(t, [fixture, userFixture(IDS.second, { role: "employee" })]);
  const request = await startApi(t);
  const token = generateAccessToken(fixture);
  const duplicate = await request("PATCH", `/users/${IDS.second}`, token, { email: fixture.email });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.code, "DUPLICATE_KEY");
  assert.equal((await request("GET", "/users?page=" + "9".repeat(310), token)).status, 400);
  assert.equal((await request("GET", "/users?limit=101", token)).status, 400);
  assert.equal((await request("GET", `/users/${IDS.employee}`, token)).status, 404);
  assert.equal((await request("GET", "/users/invalid", token)).status, 400);
});

test("HTTP: hai Admin tự hạ quyền đồng thời giữ lại đúng một Admin", async (t) => {
  t.mock.method(console, "error", () => {});
  const first = userFixture();
  const second = userFixture(IDS.second);
  const state = mockDatabase(t, [first, second]);
  const request = await startApi(t);
  const results = await Promise.all([
    request("PATCH", `/users/${IDS.admin}`, generateAccessToken(first), { role: "employee" }),
    request("PATCH", `/users/${IDS.second}`, generateAccessToken(second), { role: "employee" }),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
  assert.equal(state.activeAdmins(), 1);
});

test("HTTP: JSON lỗi không đưa mật khẩu vào log hoặc phản hồi", async (t) => {
  mockDatabase(t, []);
  const log = t.mock.method(console, "error", () => {});
  const request = await startApi(t);
  const secret = "SYNTHETIC-PASSWORD-ONLY";
  const result = await request("POST", "/auth/login", undefined, `{"password":"${secret}",}`, true);
  assert.equal(result.status, 400);
  assert.equal(JSON.stringify(result).includes(secret), false);
  assert.equal(JSON.stringify(log.mock.calls.map((call) => call.arguments)).includes(secret), false);
});

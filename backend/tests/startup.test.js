const { IDS, TEST_PASSWORD, userFixture, mockDatabase } = require("./helpers/mock-database");
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const app = require("../src/app");

const connectedFixture = { connection: { host: "mock-only", name: "devmaster_test_mock" } };
const closeServer = async (server) => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
};

test("import server.js không đọc .env, không kết nối MongoDB hoặc mở HTTP", (t) => {
  const config = t.mock.method(dotenv, "config", () => assert.fail("Không được đọc .env trong test"));
  const connect = t.mock.method(mongoose, "connect", () => assert.fail("Import không được mở MongoDB"));
  const listen = t.mock.method(app, "listen", () => assert.fail("Import không được mở HTTP"));
  const { startServer } = require("../src/server");
  assert.equal(typeof startServer, "function");
  assert.equal(config.mock.callCount(), 0);
  assert.equal(connect.mock.callCount(), 0);
  assert.equal(listen.mock.callCount(), 0);
});

test("khởi động backend với MongoDB giả và gọi health/login/me/users qua HTTP thật", async (t) => {
  t.mock.method(console, "log", () => {});
  const fixture = userFixture();
  mockDatabase(t, [fixture]);
  const connect = t.mock.method(mongoose, "connect", async () => connectedFixture);
  const { startServer } = require("../src/server");
  const server = await startServer({ port: 0, host: "127.0.0.1" });
  t.after(() => closeServer(server));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  assert.equal(connect.mock.callCount(), 1);
  assert.equal(connect.mock.calls[0].arguments[0], "mongodb://127.0.0.1:1/devmaster_test_disabled");
  const health = await fetch(base + "/health");
  assert.equal(health.status, 200);
  assert.equal((await health.json()).success, true);
  const login = await fetch(base + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: fixture.email, password: TEST_PASSWORD }) });
  assert.equal(login.status, 200);
  const { data } = await login.json();
  const headers = { Authorization: `Bearer ${data.accessToken}` };
  const me = await fetch(base + "/auth/me", { headers });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).data.user._id, IDS.admin);
  assert.equal((await fetch(base + "/users", { headers })).status, 200);
});

test("không mở HTTP trước khi kết nối database hoàn tất", async (t) => {
  t.mock.method(console, "log", () => {});
  let finishConnect;
  t.mock.method(mongoose, "connect", () => new Promise((resolve) => { finishConnect = resolve; }));
  const listen = t.mock.method(app, "listen");
  const { startServer } = require("../src/server");
  const starting = startServer({ port: 0, host: "127.0.0.1" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(listen.mock.callCount(), 0);
  finishConnect(connectedFixture);
  const server = await starting;
  t.after(() => closeServer(server));
  assert.equal(listen.mock.callCount(), 1);
});

test("lỗi MongoDB từ chối khởi động, không thoát cưỡng bức và không log URI bí mật", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const listen = t.mock.method(app, "listen", () => assert.fail("Không được mở HTTP khi MongoDB lỗi"));
  t.mock.method(process, "exit", () => assert.fail("Hàm kết nối không được gọi process.exit"));
  const failure = Object.assign(new Error("mongodb://user:STARTUP-SECRET@host/database"), { name: "MongoNetworkError" });
  t.mock.method(mongoose, "connect", async () => { throw failure; });
  const { startServer } = require("../src/server");
  await assert.rejects(startServer({ port: 0, host: "127.0.0.1" }), (error) => error === failure);
  assert.equal(listen.mock.callCount(), 0);
  assert.equal(JSON.stringify(log.mock.calls.map((call) => call.arguments)).includes("STARTUP-SECRET"), false);
});

test("cổng bị chiếm trả lỗi EADDRINUSE qua Promise khởi động", async (t) => {
  t.mock.method(console, "log", () => {});
  t.mock.method(mongoose, "connect", async () => connectedFixture);
  const { startServer } = require("../src/server");
  const first = await startServer({ port: 0, host: "127.0.0.1" });
  t.after(() => closeServer(first));
  await assert.rejects(startServer({ port: first.address().port, host: "127.0.0.1" }), { code: "EADDRINUSE" });
});

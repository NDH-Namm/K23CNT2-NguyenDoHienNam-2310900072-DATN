require("./helpers/mock-database");
const test = require("node:test");
const assert = require("node:assert/strict");
const errorMiddleware = require("../src/middlewares/error.middleware");
const createError = require("../src/utils/app-error");

const handle = (error) => {
  const result = {};
  errorMiddleware(error, {}, {
    status(code) { result.status = code; return this; }, json(body) { result.body = body; },
  }, () => assert.fail("Không được chuyển lỗi ra ngoài"));
  return result;
};

test("11000 thành 409, không trả keyValue hoặc message nội bộ", (t) => {
  t.mock.method(console, "error", () => {});
  for (const field of ["email", "employeeCode", "unknown"]) {
    const error = Object.assign(new Error("secret-value"), { code: 11000,
      keyPattern: { [field]: 1 }, keyValue: { [field]: "secret-value" } });
    const result = handle(error);
    assert.equal(result.status, 409);
    assert.equal(result.body.code, "DUPLICATE_KEY");
    assert.equal(JSON.stringify(result).includes("secret-value"), false);
  }
});

test("log không chứa password, JWT, body, stack, cause hoặc URI", (t) => {
  const secret = "SECRET-TEST-ONLY";
  const log = t.mock.method(console, "error", () => {});
  const error = Object.assign(new Error(secret), { name: secret, body: { password: secret },
    cause: new Error(secret), headers: { authorization: secret }, uri: secret });
  const result = handle(error);
  assert.equal(result.status, 500);
  assert.equal(JSON.stringify(log.mock.calls.map((call) => call.arguments)).includes(secret), false);
  assert.equal(JSON.stringify(result).includes(secret), false);
});

test("JSON sai cú pháp và lỗi validation trả 400 với thông báo an toàn", (t) => {
  t.mock.method(console, "error", () => {});
  const parser = Object.assign(new SyntaxError("password-secret"), { type: "entity.parse.failed", body: "password-secret" });
  assert.deepEqual(handle(parser), { status: 400, body: { success: false, message: "Dữ liệu JSON không hợp lệ." } });
  for (const name of ["ValidationError", "CastError", "ZodError"]) {
    assert.equal(handle(Object.assign(new Error("secret"), { name })).status, 400);
  }
});

test("lỗi nghiệp vụ giữ HTTP status; lỗi kỹ thuật không lộ message", (t) => {
  t.mock.method(console, "error", () => {});
  assert.equal(handle(createError("Không tìm thấy người dùng.", 404)).status, 404);
  assert.equal(handle(Object.assign(new Error("secret"), { statusCode: 400 })).body.message.includes("secret"), false);
  assert.equal(handle(Object.assign(new Error("secret"), { statusCode: 413 })).status, 413);
});

require("./helpers/mock-database");
const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const { newPasswordSchema, existingPasswordSchema } = require("../src/validators/password.validator");
const { hashPassword } = require("../src/utils/password");
const { validateCreateUser, validateUpdateUser, validateListUsers, validateUpdateStatus } = require("../src/modules/users/user.validator");
const { validateLogin, validateChangePassword } = require("../src/modules/auth/auth.validator");

const validate = (validator, data, query = false) => {
  const req = query ? { query: data } : { body: data };
  const result = { status: 200, next: false };
  validator(req, { status(code) { result.status = code; return this; }, json(body) { result.body = body; } },
    () => { result.next = true; });
  return { ...result, data: query ? req.validatedQuery : req.body };
};

test("mật khẩu mới kiểm tra byte UTF-8, không cắt hoặc trim", async () => {
  for (const password of ["a".repeat(72), "á".repeat(36), "🙂".repeat(18), "  Valid123!  "]) {
    assert.equal(newPasswordSchema.parse(password), password);
  }
  for (const password of ["a".repeat(73), "á".repeat(37), "🙂".repeat(19), " ".repeat(8), "short"]) {
    assert.equal(newPasswordSchema.safeParse(password).success, false);
    await assert.rejects(hashPassword(password));
  }
  const hash = await hashPassword("  Valid123!  ");
  assert.equal(bcrypt.getRounds(hash), 12);
  assert.equal(await bcrypt.compare("  Valid123!  ", hash), true);
  assert.equal(await bcrypt.compare("Valid123!", hash), false);
});

test("đăng nhập và currentPassword tương thích mật khẩu cũ trên 72 byte", () => {
  const old = "á".repeat(50);
  assert.equal(existingPasswordSchema.safeParse(old).success, true);
  assert.equal(validate(validateLogin, { email: "old@example.invalid", password: old }).next, true);
  assert.equal(validate(validateChangePassword, { currentPassword: old, newPassword: "NewPassword123!" }).next, true);
  assert.equal(validate(validateChangePassword, { currentPassword: old, newPassword: old }).status, 400);
});

test("tạo Users chuẩn hóa dữ liệu và từ chối mật khẩu trên 72 byte", () => {
  const payload = { employeeCode: " nv01 ", fullName: " Nguyễn Văn A ", email: " TEST@EXAMPLE.INVALID ",
    password: "Valid123!", role: "employee" };
  const result = validate(validateCreateUser, payload);
  assert.equal(result.next, true);
  assert.equal(result.data.employeeCode, "NV01");
  assert.equal(result.data.email, "test@example.invalid");
  assert.equal(validate(validateCreateUser, { ...payload, password: "a".repeat(73) }).status, 400);
  assert.equal(validate(validateCreateUser, { ...payload, role: "superadmin" }).status, 400);
});

test("PATCH không được đổi mật khẩu, tokenVersion hoặc gửi trường ngoài danh sách", () => {
  for (const body of [{}, { password: "Valid123!" }, { tokenVersion: 0 }, { mustChangePassword: false }, { isDeleted: true }]) {
    assert.equal(validate(validateUpdateUser, body).status, 400);
  }
  assert.equal(validate(validateUpdateStatus, { status: "invalid" }).status, 400);
  assert.equal(validate(validateUpdateUser, { fullName: "Họ tên mới" }).next, true);
});

test("phân trang có mặc định và giới hạn rõ ràng", () => {
  assert.deepEqual(validate(validateListUsers, {}, true).data, { page: 1, limit: 10 });
  assert.deepEqual(validate(validateListUsers, { page: "2", limit: "100" }, true).data, { page: 2, limit: 100 });
  for (const page of ["0", "-1", "1.5", "1e3", "Infinity", "", " ", "100001", "9".repeat(310), ["1", "2"], { $gt: 1 }]) {
    assert.equal(validate(validateListUsers, { page }, true).status, 400, JSON.stringify(page));
  }
  for (const limit of ["0", "101", "9".repeat(310), ["1", "2"]]) {
    assert.equal(validate(validateListUsers, { limit }, true).status, 400);
  }
});

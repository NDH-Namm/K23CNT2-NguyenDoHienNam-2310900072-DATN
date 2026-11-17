const { z } = require("zod");

// Không trim mật khẩu: khoảng trắng có thể là một phần mật khẩu hợp lệ.
const newPasswordSchema = z.string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
  .refine((value) => value.trim().length > 0, {
    message: "Mật khẩu không được chỉ gồm khoảng trắng.",
  })
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, {
    message: "Mật khẩu không được vượt quá 72 byte UTF-8.",
  });

// Giữ khả năng xác thực mật khẩu cũ để người dùng chuyển sang mật khẩu mới.
const existingPasswordSchema = z.string()
  .min(1, "Vui lòng nhập mật khẩu hiện tại.")
  .max(128, "Mật khẩu không được vượt quá 128 ký tự.");

module.exports = { newPasswordSchema, existingPasswordSchema };


const { z } = require("zod");

// =====================================
// VALIDATE ĐĂNG NHẬP
// =====================================

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email không đúng định dạng.")
    .max(150)
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
    .max(128, "Mật khẩu không được vượt quá 128 ký tự."),
});

const validateLogin = (req, res, next) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Dữ liệu đăng nhập không hợp lệ.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  req.body = result.data;
  next();
};

// =====================================
// VALIDATE ĐỔI MẬT KHẨU
// =====================================

const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu hiện tại.")
    .max(128),

  newPassword: z
    .string()
    .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự.")
    .max(128, "Mật khẩu mới không được vượt quá 128 ký tự."),
});

const validateChangePassword = (req, res, next) => {
  const result = changePasswordSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Dữ liệu đổi mật khẩu không hợp lệ.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  req.body = result.data;
  next();
};

// =====================================
// EXPORT
// =====================================

module.exports = {
  validateLogin,
  validateChangePassword,
};

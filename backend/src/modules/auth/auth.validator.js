
const { z } = require("zod");
const { newPasswordSchema, existingPasswordSchema } = require("../../validators/password.validator");

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

  password: existingPasswordSchema,
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
  currentPassword: existingPasswordSchema,
  newPassword: newPasswordSchema,
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


const { z } = require("zod");
const { newPasswordSchema } = require("../../validators/password.validator");
const { paginationSchema } = require("../../validators/pagination.validator");

const ROLES = [
  "admin",
  "manager",
  "warehouse",
  "employee",
];

const STATUSES = [
  "active",
  "inactive",
  "locked",
];

// =====================================
// VALIDATE TẠO TÀI KHOẢN
// =====================================

const createUserSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(1, "Mã nhân viên không được để trống.")
    .max(30)
    .transform((value) => value.toUpperCase()),

  fullName: z
    .string()
    .trim()
    .min(2, "Họ tên phải có ít nhất 2 ký tự.")
    .max(100),

  email: z
    .string()
    .trim()
    .email("Email không đúng định dạng.")
    .max(150)
    .transform((value) => value.toLowerCase()),

  password: newPasswordSchema,

  phone: z
    .string()
    .trim()
    .max(20)
    .optional(),

  role: z.enum(ROLES),

  departmentId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "ID phòng ban không hợp lệ.")
    .nullable()
    .optional(),

  positionId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "ID chức vụ không hợp lệ.")
    .nullable()
    .optional(),
});

// =====================================
// VALIDATE CẬP NHẬT TÀI KHOẢN
// =====================================

const updateUserSchema = z.object({
  employeeCode: z.string().trim().min(1).max(30)
    .transform((value) => value.toUpperCase())
    .optional(),

  fullName: z.string().trim().min(2).max(100).optional(),

  email: z.string().trim().email().max(150)
    .transform((value) => value.toLowerCase())
    .optional(),

  phone: z.string().trim().max(20).optional(),

  avatar: z.string().trim().max(500).optional(),

  role: z.enum(ROLES).optional(),

  departmentId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .nullable()
    .optional(),

  positionId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .nullable()
    .optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Vui lòng cung cấp thông tin cần cập nhật." }
);

// =====================================
// VALIDATE TRẠNG THÁI TÀI KHOẢN
// =====================================

const updateStatusSchema = z.object({
  status: z.enum(STATUSES, {
    error: "Trạng thái tài khoản không hợp lệ.",
  }),
});

// =====================================
// VALIDATE QUERY DANH SÁCH
// =====================================

const listUsersSchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(STATUSES).optional(),
  departmentId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional(),
});

// =====================================
// MIDDLEWARE VALIDATION DÙNG CHUNG
// =====================================

const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu gửi lên không hợp lệ.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    req.body = result.data;
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Tham số tìm kiếm không hợp lệ.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    req.validatedQuery = result.data;
    next();
  };
};

module.exports = {
  validateCreateUser: validateBody(createUserSchema),
  validateUpdateUser: validateBody(updateUserSchema),
  validateUpdateStatus: validateBody(updateStatusSchema),
  validateListUsers: validateQuery(listUsersSchema),
};

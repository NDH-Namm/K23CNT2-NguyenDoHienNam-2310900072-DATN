
const express = require("express");

const router = express.Router();

// Controller
const userController = require("./user.controller");

// Middleware
const authenticate = require("../../middlewares/auth.middleware");
const requirePasswordChanged = require("../../middlewares/password-change.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");
const {
  validateCreateUser,
  validateUpdateUser,
  validateUpdateStatus,
  validateListUsers,
} = require("./user.validator");
// =====================================
// TẤT CẢ ROUTES ĐỀU YÊU CẦU ĐĂNG NHẬP
// =====================================
router.use(authenticate, requirePasswordChanged);

// =====================================
// 1. DANH SÁCH NGƯỜI DÙNG
// Admin và Manager
// =====================================
router.get(
  "/",
  authorizeRoles("admin", "manager"),
  validateListUsers,
  userController.getUsers
);

// =====================================
// 2. TẠO TÀI KHOẢN
// Chỉ Admin
// =====================================
router.post(
  "/",
  authorizeRoles("admin"),
  validateCreateUser,
  userController.createUser
);

// =====================================
// 3. CHI TIẾT NGƯỜI DÙNG
// Admin và Manager
// =====================================
router.get(
  "/:id",
  authorizeRoles("admin", "manager"),
  userController.getUserById
);

// =====================================
// 4. CẬP NHẬT THÔNG TIN
// Chỉ Admin
// =====================================
router.patch(
  "/:id",
  authorizeRoles("admin"),
  validateUpdateUser,
  userController.updateUser
);

// =====================================
// 5. KHÓA / MỞ KHÓA TÀI KHOẢN
// Chỉ Admin
// =====================================
router.patch(
  "/:id/status",
  authorizeRoles("admin"),
  validateUpdateStatus,
  userController.updateUserStatus
);

// =====================================
// 6. XÓA MỀM TÀI KHOẢN
// Chỉ Admin
// =====================================
router.delete(
  "/:id",
  authorizeRoles("admin"),
  userController.deleteUser
);

module.exports = router;

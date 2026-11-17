
const express = require("express");

const router = express.Router();

// Controllers
const authController = require("./auth.controller");

// Validators
const {
  validateLogin,
  validateChangePassword,
} = require("./auth.validator");

// Middleware
const authenticate = require("../../middlewares/auth.middleware");

// =====================================
// ĐĂNG NHẬP
// =====================================
router.post(
  "/login",
  validateLogin,
  authController.login
);

// =====================================
// LẤY THÔNG TIN TÀI KHOẢN
// =====================================
router.get(
  "/me",
  authenticate,
  authController.getMe
);

// =====================================
// ĐỔI MẬT KHẨU
// =====================================
router.patch(
  "/change-password",
  authenticate,
  validateChangePassword,
  authController.changePassword
);

module.exports = router;

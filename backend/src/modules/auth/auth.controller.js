
const authService = require("./auth.service");

class AuthController {
  // API đăng nhập
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(
        email,
        password
      );

      return res.status(200).json({
        success: true,
        message: "Đăng nhập thành công.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

async changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await authService.changePassword(
      req.user._id,
      currentPassword,
      newPassword
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

  // Lấy thông tin tài khoản đang đăng nhập
  async getMe(req, res, next) {
    try {
      const user = req.user;

      return res.status(200).json({
        success: true,
        message: "Lấy thông tin tài khoản thành công.",
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

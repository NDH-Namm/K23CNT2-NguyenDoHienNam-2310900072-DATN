
const User = require("../users/user.model");

const {
  hashPassword,
  comparePassword,
} = require("../../utils/password");

const {
  generateAccessToken,
} = require("../../utils/jwt");

class AuthService {
  // =====================================
  // ĐĂNG NHẬP
  // =====================================
  async login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

    // Tìm tài khoản
    const user = await User.findOne({
      email: normalizedEmail,
      isDeleted: false,
    }).select("+password");

    if (!user) {
      const error = new Error(
        "Email hoặc mật khẩu không chính xác."
      );
      error.statusCode = 401;
      throw error;
    }

    // Kiểm tra trạng thái
    if (user.status !== "active") {
      const error = new Error(
        "Tài khoản hiện không thể đăng nhập."
      );
      error.statusCode = 403;
      throw error;
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await comparePassword(
      password,
      user.password
    );

    if (!isPasswordValid) {
      const error = new Error(
        "Email hoặc mật khẩu không chính xác."
      );
      error.statusCode = 401;
      throw error;
    }

    // Tạo JWT
    const accessToken = generateAccessToken(user);

    // Cập nhật lần đăng nhập
    user.lastLoginAt = new Date();
    await user.save();

    // Thông tin trả về
    const userData = {
      id: user._id,
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      departmentId: user.departmentId,
      positionId: user.positionId,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
    };

    return {
      accessToken,
      user: userData,
    };
  }

  // =====================================
  // ĐỔI MẬT KHẨU
  // =====================================
  async changePassword(
    userId,
    currentPassword,
    newPassword
  ) {
    // Tìm tài khoản
    const user = await User.findOne({
      _id: userId,
      isDeleted: false,
      status: "active",
    }).select("+password");

    if (!user) {
      const error = new Error(
        "Không tìm thấy tài khoản."
      );
      error.statusCode = 404;
      throw error;
    }

    // Kiểm tra mật khẩu hiện tại
    const isValid = await comparePassword(
      currentPassword,
      user.password
    );

    if (!isValid) {
      const error = new Error(
        "Mật khẩu hiện tại không chính xác."
      );
      error.statusCode = 400;
      throw error;
    }

    // Không cho phép sử dụng lại mật khẩu cũ
    if (currentPassword === newPassword) {
      const error = new Error(
        "Mật khẩu mới phải khác mật khẩu hiện tại."
      );
      error.statusCode = 400;
      throw error;
    }

    // Mã hóa mật khẩu mới
    user.password = await hashPassword(newPassword);

    // Cập nhật trạng thái
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();

    await user.save();

    return {
      message:
        "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.",
    };
  }
}

module.exports = new AuthService();

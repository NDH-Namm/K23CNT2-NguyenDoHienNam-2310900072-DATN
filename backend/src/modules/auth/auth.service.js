
const User = require("../users/user.model");
const createError = require("../../utils/app-error");
const { getTokenVersion, isValidTokenVersion, tokenVersionFilter } = require("../../utils/token-version");

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
    }, null, { readPreference: "primary" }).select("+password +tokenVersion");

    if (!user) {
      throw createError("Email hoặc mật khẩu không chính xác.", 401);
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await comparePassword(
      password,
      user.password
    );

    if (!isPasswordValid) {
      throw createError("Email hoặc mật khẩu không chính xác.", 401);
    }

    // Chỉ tiết lộ trạng thái sau khi mật khẩu đã được xác minh.
    if (user.status !== "active") {
      throw createError("Tài khoản hiện không thể đăng nhập.", 403);
    }

    // Tạo JWT
    const accessToken = generateAccessToken(user);

    // Cập nhật lần đăng nhập
    const lastLoginAt = new Date();
    const loginUpdate = await User.updateOne({
      _id: user._id, status: "active", isDeleted: false, password: user.password,
      ...tokenVersionFilter(getTokenVersion(user)),
    }, { $set: { lastLoginAt } }, { writeConcern: { w: "majority" } });
    if (loginUpdate.matchedCount !== 1) {
      throw createError("Thông tin xác thực đã thay đổi. Vui lòng đăng nhập lại.", 401);
    }

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
      lastLoginAt,
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
    newPassword,
    expectedTokenVersion = 0
  ) {
    // Tìm tài khoản
    const user = await User.findOne({
      _id: userId,
      isDeleted: false,
      status: "active",
    }, null, { readPreference: "primary" }).select("+password +tokenVersion");

    if (!user) {
      throw createError("Không tìm thấy tài khoản.", 404);
    }

    const currentVersion = getTokenVersion(user);
    if (!isValidTokenVersion(currentVersion) || currentVersion !== expectedTokenVersion) {
      throw createError("Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.", 401);
    }
    if (currentVersion === Number.MAX_SAFE_INTEGER) {
      throw createError("Không thể tăng phiên bản xác thực. Vui lòng liên hệ quản trị hệ thống.", 409);
    }

    // Kiểm tra mật khẩu hiện tại
    const isValid = await comparePassword(
      currentPassword,
      user.password
    );

    if (!isValid) {
      throw createError("Mật khẩu hiện tại không chính xác.", 400);
    }

    // Không cho phép sử dụng lại mật khẩu cũ
    if (await comparePassword(newPassword, user.password)) {
      throw createError("Mật khẩu mới phải khác mật khẩu hiện tại.", 400);
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await hashPassword(newPassword);

    // Một lệnh nguyên tử: đổi hash và tăng phiên bản cùng lúc. Điều kiện hash
    // và version ngăn hai yêu cầu cùng mật khẩu cũ ghi đè kết quả của nhau.
    const result = await User.updateOne({
      _id: userId, isDeleted: false, status: "active", password: user.password,
      ...tokenVersionFilter(currentVersion),
    }, {
      $set: { password: hashedPassword, mustChangePassword: false, passwordChangedAt: new Date() },
      $inc: { tokenVersion: 1 },
    }, { runValidators: true, writeConcern: { w: "majority" } });
    if (result.matchedCount !== 1) {
      throw createError("Tài khoản hoặc mật khẩu đã thay đổi. Vui lòng đăng nhập lại.",
        409, "PASSWORD_CHANGE_CONFLICT");
    }

    return {
      message:
        "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.",
    };
  }
}

module.exports = new AuthService();

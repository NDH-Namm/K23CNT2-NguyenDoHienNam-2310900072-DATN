
const mongoose = require("mongoose");
const User = require("./user.model");
const { hashPassword } = require("../../utils/password");

// =====================================
// HÀM HỖ TRỢ
// =====================================

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

class UserService {
  // =====================================
  // 1. DANH SÁCH NGƯỜI DÙNG
  // =====================================

  async getUsers(filters = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      status,
      departmentId,
    } = filters;

    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(limit) || 10)
    );

    const query = {
      isDeleted: false,
    };

    // Tìm kiếm theo mã, họ tên, email
    if (search && search.trim()) {
      const keyword = new RegExp(
        escapeRegex(search.trim()),
        "i"
      );

      query.$or = [
        { employeeCode: keyword },
        { fullName: keyword },
        { email: keyword },
      ];
    }

    // Lọc theo vai trò
    if (role) {
      query.role = role;
    }

    // Lọc theo trạng thái
    if (status) {
      query.status = status;
    }

    // Lọc theo phòng ban
    if (departmentId) {
      if (!mongoose.isValidObjectId(departmentId)) {
        throw createError("ID phòng ban không hợp lệ.", 400);
      }

      query.departmentId = departmentId;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .lean(),

      User.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        currentPage,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // =====================================
  // 2. CHI TIẾT NGƯỜI DÙNG
  // =====================================

  async getUserById(userId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw createError("ID người dùng không hợp lệ.", 400);
    }

    const user = await User.findOne({
      _id: userId,
      isDeleted: false,
    })
      .select("-password")
      .lean();

    if (!user) {
      throw createError("Không tìm thấy người dùng.", 404);
    }

    return user;
  }

  // =====================================
  // 3. TẠO TÀI KHOẢN
  // =====================================

  async createUser(data, creatorId) {
    const {
      employeeCode,
      fullName,
      email,
      password,
      phone,
      role,
      departmentId,
      positionId,
    } = data;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = employeeCode.trim().toUpperCase();

    // Kiểm tra email và mã nhân viên
    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { employeeCode: normalizedCode },
      ],
    });

    if (existingUser) {
      throw createError(
        "Email hoặc mã nhân viên đã được sử dụng.",
        409
      );
    }

    // Mã hóa mật khẩu
    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      employeeCode: normalizedCode,
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone || "",
      role,
      departmentId: departmentId || null,
      positionId: positionId || null,
      status: "active",
      mustChangePassword: true,
      createdBy: creatorId,
      isDeleted: false,
    });

    const result = user.toObject();
    delete result.password;

    return result;
  }

  // =====================================
  // 4. CẬP NHẬT THÔNG TIN
  // =====================================

  async updateUser(userId, data) {
    if (!mongoose.isValidObjectId(userId)) {
      throw createError("ID người dùng không hợp lệ.", 400);
    }

    const user = await User.findOne({
      _id: userId,
      isDeleted: false,
    });

    if (!user) {
      throw createError("Không tìm thấy người dùng.", 404);
    }

    const allowedFields = [
      "employeeCode",
      "fullName",
      "email",
      "phone",
      "avatar",
      "role",
      "departmentId",
      "positionId",
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        user[field] = data[field];
      }
    }

    if (data.email !== undefined) {
      user.email = data.email.trim().toLowerCase();
    }

    if (data.employeeCode !== undefined) {
      user.employeeCode = data.employeeCode.trim().toUpperCase();
    }

    await user.save();

    const result = user.toObject();
    delete result.password;

    return result;
  }

  // =====================================
  // 5. KHÓA / MỞ KHÓA TÀI KHOẢN
  // =====================================

  async updateUserStatus(userId, status, currentUserId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw createError("ID người dùng không hợp lệ.", 400);
    }

    if (!["active", "inactive", "locked"].includes(status)) {
      throw createError("Trạng thái tài khoản không hợp lệ.", 400);
    }

    if (userId.toString() === currentUserId.toString()) {
      throw createError(
        "Bạn không thể tự thay đổi trạng thái tài khoản của mình.",
        400
      );
    }

    const user = await User.findOne({
      _id: userId,
      isDeleted: false,
    });

    if (!user) {
      throw createError("Không tìm thấy người dùng.", 404);
    }

    user.status = status;
    await user.save();

    return {
      id: user._id,
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      status: user.status,
    };
  }

  // =====================================
  // 6. XÓA MỀM TÀI KHOẢN
  // =====================================

  async deleteUser(userId, currentUserId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw createError("ID người dùng không hợp lệ.", 400);
    }

    if (userId.toString() === currentUserId.toString()) {
      throw createError(
        "Bạn không thể tự xóa tài khoản của mình.",
        400
      );
    }

    const user = await User.findOne({
      _id: userId,
      isDeleted: false,
    });

    if (!user) {
      throw createError("Không tìm thấy người dùng.", 404);
    }

    user.isDeleted = true;
    user.status = "inactive";

    await user.save();

    return {
      id: user._id,
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      message: "Xóa tài khoản thành công.",
    };
  }
}

module.exports = new UserService();


const mongoose = require("mongoose");
const User = require("./user.model");
const { hashPassword } = require("../../utils/password");
const createError = require("../../utils/app-error");
const { paginationSchema } = require("../../validators/pagination.validator");
const { withUserMutationLock } = require("./user-mutation-lock");

// =====================================
// HÀM HỖ TRỢ
// =====================================

const assertUserId = (id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw createError("ID người dùng không hợp lệ.", 400);
  }
};

const isSameId = (left, right) => new mongoose.Types.ObjectId(left).equals(right);

const activeAdmin = (user) => user.role === "admin" && user.status === "active" && !user.isDeleted;
const readOptions = { readPreference: "primary" };

const assertActor = async (actorId) => {
  const actor = await User.findOne({ _id: actorId, role: "admin", status: "active", isDeleted: false },
    null, readOptions);
  if (!actor) throw createError("Bạn không còn quyền thực hiện thao tác này.", 403);
  if (actor.mustChangePassword !== false) {
    throw createError("Bạn phải đổi mật khẩu ban đầu trước khi sử dụng chức năng này.",
      403, "PASSWORD_CHANGE_REQUIRED");
  }
};

// Phải gọi bên trong khóa chung; count rồi ghi riêng lẻ không an toàn.
const assertAdminRemains = async (user, changes) => {
  if (activeAdmin(user) && !activeAdmin({ role: user.role, status: user.status,
    isDeleted: user.isDeleted, ...changes })) {
    const count = await User.countDocuments({ role: "admin", status: "active", isDeleted: false }, readOptions);
    if (count <= 1) {
      throw createError("Phải giữ lại ít nhất một tài khoản Admin đang hoạt động.", 409, "LAST_ACTIVE_ADMIN");
    }
  }
};

const updateOptions = { new: true, runValidators: true, writeConcern: { w: "majority" } };

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

    const { page: currentPage, limit: pageSize } = paginationSchema.parse({ page, limit });

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
        .select("-password -tokenVersion")
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
    assertUserId(userId);

    const user = await User.findOne({
      _id: userId,
      isDeleted: false,
    })
      .select("-password -tokenVersion")
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

    assertUserId(creatorId);
    // Hash trước khi giữ khóa để tránh chặn các thao tác khác vì bcrypt.
    const hashedPassword = await hashPassword(password);
    return withUserMutationLock(async (write) => {
      await assertActor(creatorId);
      // Kiểm tra email và mã nhân viên
      const existingUser = await User.findOne({
        $or: [
          { email: normalizedEmail },
          { employeeCode: normalizedCode },
        ],
      }, null, readOptions);

      if (existingUser) {
        throw createError("Email hoặc mã nhân viên đã được sử dụng.", 409);
      }

      const [user] = await write(() => User.create([{
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
      }], { writeConcern: { w: "majority" } }));

      return user.toObject();
    });
  }

  // =====================================
  // 4. CẬP NHẬT THÔNG TIN
  // =====================================

  async updateUser(userId, data, currentUserId) {
    assertUserId(userId);
    assertUserId(currentUserId);
    return withUserMutationLock(async (write) => {
      await assertActor(currentUserId);
      const user = await User.findOne({
        _id: userId,
        isDeleted: false,
      }, null, readOptions);

      if (!user) {
        throw createError("Không tìm thấy người dùng.", 404);
      }

      const allowedFields = [
        "employeeCode", "fullName", "email", "phone", "avatar", "role", "departmentId", "positionId",
      ];
      const changes = {};
      for (const field of allowedFields) {
        if (data[field] !== undefined) changes[field] = data[field];
      }
      if (data.email !== undefined) changes.email = data.email.trim().toLowerCase();
      if (data.employeeCode !== undefined) changes.employeeCode = data.employeeCode.trim().toUpperCase();

      await assertAdminRemains(user, changes);
      const updated = await write(() => User.findOneAndUpdate(
        { _id: userId, isDeleted: false }, { $set: changes }, updateOptions
      ));
      if (!updated) throw createError("Không tìm thấy người dùng.", 404);
      return updated.toObject();
    });
  }

  // =====================================
  // 5. KHÓA / MỞ KHÓA TÀI KHOẢN
  // =====================================

  async updateUserStatus(userId, status, currentUserId) {
    assertUserId(userId);
    assertUserId(currentUserId);

    if (!["active", "inactive", "locked"].includes(status)) {
      throw createError("Trạng thái tài khoản không hợp lệ.", 400);
    }

    if (isSameId(userId, currentUserId)) {
      throw createError(
        "Bạn không thể tự thay đổi trạng thái tài khoản của mình.",
        400
      );
    }

    return withUserMutationLock(async (write) => {
      await assertActor(currentUserId);
      const user = await User.findOne({
        _id: userId,
        isDeleted: false,
      }, null, readOptions);

      if (!user) throw createError("Không tìm thấy người dùng.", 404);

      await assertAdminRemains(user, { status });
      const updated = await write(() => User.findOneAndUpdate(
        { _id: userId, isDeleted: false }, { $set: { status } }, updateOptions
      ));
      if (!updated) throw createError("Không tìm thấy người dùng.", 404);

      return {
        id: updated._id,
        employeeCode: updated.employeeCode,
        fullName: updated.fullName,
        status: updated.status,
      };
    });
  }

  // =====================================
  // 6. XÓA MỀM TÀI KHOẢN
  // =====================================

  async deleteUser(userId, currentUserId) {
    assertUserId(userId);
    assertUserId(currentUserId);

    if (isSameId(userId, currentUserId)) {
      throw createError(
        "Bạn không thể tự xóa tài khoản của mình.",
        400
      );
    }

    return withUserMutationLock(async (write) => {
      await assertActor(currentUserId);
      const user = await User.findOne({
        _id: userId,
        isDeleted: false,
      }, null, readOptions);

      if (!user) throw createError("Không tìm thấy người dùng.", 404);

      const changes = { isDeleted: true, status: "inactive" };
      await assertAdminRemains(user, changes);
      const updated = await write(() => User.findOneAndUpdate(
        { _id: userId, isDeleted: false }, { $set: changes }, updateOptions
      ));
      if (!updated) throw createError("Không tìm thấy người dùng.", 404);

      return {
        id: updated._id,
        employeeCode: updated.employeeCode,
        fullName: updated.fullName,
        message: "Xóa tài khoản thành công.",
      };
    });
  }
}

module.exports = new UserService();

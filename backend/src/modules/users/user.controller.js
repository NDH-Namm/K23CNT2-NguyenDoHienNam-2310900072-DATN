
const userService = require("./user.service");

class UserController {
  // =====================================
  // 1. DANH SÁCH NGƯỜI DÙNG
  // =====================================
  async getUsers(req, res, next) {
    try {
      const result = await userService.getUsers(
        req.validatedQuery || {}
        );

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách người dùng thành công.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // =====================================
  // 2. CHI TIẾT NGƯỜI DÙNG
  // =====================================
  async getUserById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id);

      return res.status(200).json({
        success: true,
        message: "Lấy thông tin người dùng thành công.",
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  // =====================================
  // 3. TẠO TÀI KHOẢN
  // =====================================
  async createUser(req, res, next) {
    try {
      const user = await userService.createUser(
        req.body,
        req.user._id
      );

      return res.status(201).json({
        success: true,
        message: "Tạo tài khoản người dùng thành công.",
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  // =====================================
  // 4. CẬP NHẬT THÔNG TIN
  // =====================================
  async updateUser(req, res, next) {
    try {
      const user = await userService.updateUser(
        req.params.id,
        req.body,
        req.user._id
      );

      return res.status(200).json({
        success: true,
        message: "Cập nhật thông tin người dùng thành công.",
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  // =====================================
  // 5. KHÓA / MỞ KHÓA TÀI KHOẢN
  // =====================================
  async updateUserStatus(req, res, next) {
    try {
      const user = await userService.updateUserStatus(
        req.params.id,
        req.body.status,
        req.user._id
      );

      return res.status(200).json({
        success: true,
        message: "Cập nhật trạng thái tài khoản thành công.",
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  // =====================================
  // 6. XÓA MỀM TÀI KHOẢN
  // =====================================
  async deleteUser(req, res, next) {
    try {
      const result = await userService.deleteUser(
        req.params.id,
        req.user._id
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          id: result.id,
          employeeCode: result.employeeCode,
          fullName: result.fullName,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();

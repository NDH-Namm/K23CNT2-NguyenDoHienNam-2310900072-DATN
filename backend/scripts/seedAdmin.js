
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../src/modules/users/user.model");
const connectDatabase = require("../src/config/database");
const { hashPassword } = require("../src/utils/password");

const seedAdmin = async () => {
  try {
    // Kiểm tra thông tin cấu hình
    const {
      ADMIN_FULL_NAME,
      ADMIN_EMAIL,
      ADMIN_EMPLOYEE_CODE,
      ADMIN_PASSWORD,
    } = process.env;

    if (
      !ADMIN_FULL_NAME ||
      !ADMIN_EMAIL ||
      !ADMIN_EMPLOYEE_CODE ||
      !ADMIN_PASSWORD
    ) {
      throw new Error(
        "Thiếu thông tin Admin trong file .env"
      );
    }

    if (ADMIN_PASSWORD.length < 8) {
      throw new Error(
        "Mật khẩu Admin phải có ít nhất 8 ký tự."
      );
    }

    // Kết nối MongoDB
    await connectDatabase();

    const email = ADMIN_EMAIL.trim().toLowerCase();
    const employeeCode = ADMIN_EMPLOYEE_CODE.trim().toUpperCase();

    // Kiểm tra tài khoản đã tồn tại
    const existingAdmin = await User.findOne({
      $or: [
        { email },
        { employeeCode },
      ],
    });

    if (existingAdmin) {
      throw new Error(
        "Email hoặc mã nhân viên đã tồn tại. Không tạo Admin trùng."
      );
    }

    // Mã hóa mật khẩu
    const hashedPassword = await hashPassword(
      ADMIN_PASSWORD
    );

    // Tạo tài khoản Admin
    const admin = await User.create({
      employeeCode,
      fullName: ADMIN_FULL_NAME.trim(),
      email,
      password: hashedPassword,
      role: "admin",
      status: "active",
      mustChangePassword: true,
      departmentId: null,
      positionId: null,
      createdBy: null,
      isDeleted: false,
    });

    console.log("--------------------------------");
    console.log("TAO ADMIN THANH CONG");
    console.log("Ma nhan vien:", admin.employeeCode);
    console.log("Ho ten:", admin.fullName);
    console.log("Email:", admin.email);
    console.log("Vai tro:", admin.role);
    console.log("--------------------------------");

  } catch (error) {
    console.error("SEED ADMIN FAILED:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
};

seedAdmin();

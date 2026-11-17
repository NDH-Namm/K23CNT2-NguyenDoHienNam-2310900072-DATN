
const mongoose = require("mongoose");

const hideCredentials = (_doc, result) => {
  delete result.password;
  delete result.tokenVersion;
  return result;
};

const userSchema = new mongoose.Schema(
  {
    employeeCode: {
      type: String,
      required: [true, "Mã nhân viên không được để trống"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    fullName: {
      type: String,
      required: [true, "Họ tên không được để trống"],
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, "Email không được để trống"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 150,
    },

    password: {
      type: String,
      required: [true, "Mật khẩu không được để trống"],
      minlength: 8,
      select: false,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    avatar: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["admin", "manager", "warehouse", "employee"],
      required: true,
      default: "employee",
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    positionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Position",
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "locked"],
      default: "active",
    },

    mustChangePassword: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    // Document cũ chưa có trường này được đọc như phiên bản 0.
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
      validate: Number.isSafeInteger,
      select: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "users",
    toJSON: { transform: hideCredentials },
    toObject: { transform: hideCredentials },
  }
);

// Index tìm kiếm và đảm bảo dữ liệu duy nhất

userSchema.index({ role: 1, status: 1 });
userSchema.index({ departmentId: 1, status: 1 });

const User = mongoose.model("User", userSchema);

module.exports = User;

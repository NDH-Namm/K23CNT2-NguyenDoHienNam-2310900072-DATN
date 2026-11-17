const authRoutes = require("./modules/auth/auth.routes");
const errorMiddleware = require("./middlewares/error.middleware");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const userRoutes = require("./modules/users/user.routes");
const app = express();

// Bảo mật HTTP headers
app.use(helmet());

// Cấu hình CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Đọc dữ liệu JSON
app.use(express.json({ limit: "10mb" }));

// Đọc dữ liệu form
app.use(express.urlencoded({ extended: true }));

// Đọc Cookie
app.use(cookieParser());

// Giới hạn số lượng request
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// API kiểm tra hệ thống
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "DevMaster Backend is running!",
    data: {
      application: "DevMaster Asset Management",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    },
  });
});
// Authentication API
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
// API không tồn tại
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Không tìm thấy API yêu cầu.",
  });
});

// Error Middleware
app.use(errorMiddleware);

module.exports = app;


const User = require("../modules/users/user.model");
const { verifyAccessToken } = require("../utils/jwt");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để tiếp tục.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ.",
      });
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findOne({
      _id: decoded.id,
      status: "active",
      isDeleted: false,
    }).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản không tồn tại hoặc đã bị khóa.",
      });
    }

    // Lấy vai trò mới nhất từ Database
    req.user = user;

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
      });
    }

    next(error);
  }
};

module.exports = authenticate;

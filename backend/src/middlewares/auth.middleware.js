
const User = require("../modules/users/user.model");
const { verifyAccessToken } = require("../utils/jwt");
const { getTokenVersion, isValidTokenVersion } = require("../utils/token-version");

const rejectSession = (res) => res.status(401).json({
  success: false,
  message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
});

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (typeof authHeader !== "string" || !/^Bearer\s+\S+$/i.test(authHeader)) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để tiếp tục.",
      });
    }

    const token = authHeader.split(/\s+/)[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ.",
      });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || typeof decoded !== "object" ||
        typeof decoded.id !== "string" || !/^[0-9a-fA-F]{24}$/.test(decoded.id)) {
      return rejectSession(res);
    }

    const user = await User.findOne({
      _id: decoded.id,
      status: "active",
      isDeleted: false,
    }, null, { readPreference: "primary" }).select("-password +tokenVersion");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản không tồn tại hoặc đã bị khóa.",
      });
    }

    const storedVersion = getTokenVersion(user);
    const legacyToken = decoded.tokenVersion === undefined;
    const presentedVersion = legacyToken ? 0 : decoded.tokenVersion;
    if (!isValidTokenVersion(storedVersion) ||
        !isValidTokenVersion(presentedVersion) ||
        presentedVersion !== storedVersion) {
      return rejectSession(res);
    }

    // JWT cũ chỉ tương thích với phiên bản 0 và không được phát trước
    // lần đổi mật khẩu trước đây. Trường hợp cùng giây yêu cầu đăng nhập lại.
    if (legacyToken && user.passwordChangedAt &&
        (!Number.isFinite(decoded.iat) ||
         decoded.iat <= Math.floor(new Date(user.passwordChangedAt).getTime() / 1000))) {
      return rejectSession(res);
    }

    // Lấy vai trò mới nhất từ Database
    req.user = user;

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
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


const jwt = require("jsonwebtoken");
const { getTokenVersion, isValidTokenVersion } = require("./token-version");

const generateAccessToken = (user) => {
  const tokenVersion = getTokenVersion(user);
  if (!isValidTokenVersion(tokenVersion)) {
    throw new Error("Phiên bản xác thực của tài khoản không hợp lệ.");
  }
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      tokenVersion,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      algorithm: "HS256",
    }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
};

module.exports = {
  generateAccessToken,
  verifyAccessToken,
};

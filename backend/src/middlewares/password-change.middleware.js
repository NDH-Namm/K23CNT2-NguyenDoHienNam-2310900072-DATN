const requirePasswordChanged = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Vui lòng đăng nhập để tiếp tục." });
  }
  if (req.user.mustChangePassword !== false) {
    return res.status(403).json({
      success: false,
      code: "PASSWORD_CHANGE_REQUIRED",
      message: "Bạn phải đổi mật khẩu ban đầu trước khi sử dụng chức năng này.",
    });
  }
  next();
};

module.exports = requirePasswordChanged;

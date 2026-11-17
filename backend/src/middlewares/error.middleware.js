
const { logError } = require("../utils/logger");

const errorMiddleware = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let statusCode = 500;
  let message = "Đã xảy ra lỗi máy chủ.";
  let code;

  if (err.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_KEY";
    const fields = Object.keys(err.keyPattern || {});
    message = fields.includes("email") ? "Email đã được sử dụng."
      : fields.includes("employeeCode") ? "Mã nhân viên đã được sử dụng."
      : "Dữ liệu đã tồn tại. Vui lòng kiểm tra lại.";
  } else if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Dữ liệu JSON không hợp lệ.";
  } else if (["ValidationError", "CastError", "ZodError"].includes(err.name)) {
    statusCode = 400;
    message = "Dữ liệu gửi lên không hợp lệ.";
  } else if (err.isOperational && Number.isInteger(err.statusCode) &&
      err.statusCode >= 400 && err.statusCode < 600) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  } else {
    const safeMessages = {
      400: "Dữ liệu gửi lên không hợp lệ.",
      413: "Dữ liệu gửi lên vượt quá kích thước cho phép.",
      415: "Định dạng dữ liệu không được hỗ trợ.",
      429: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
    };
    const status = err.statusCode || err.status;
    if (Object.hasOwn(safeMessages, status)) {
      statusCode = Number(status);
      message = safeMessages[status];
    }
  }

  logError(err, "http", statusCode);
  return res.status(statusCode).json({ success: false, message, ...(code ? { code } : {}) });
};

module.exports = errorMiddleware;

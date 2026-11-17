const createError = (message, statusCode, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  if (code) error.code = code;
  return error;
};

module.exports = createError;

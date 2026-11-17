// Chỉ ghi metadata cho phép; không ghi message/stack/cause/body/headers/URI.
const logError = (error, context, statusCode = 500) => {
  const knownNames = new Set([
    "ValidationError", "CastError", "ZodError", "MongoServerError",
    "MongoNetworkError", "MongoServerSelectionError", "SyntaxError",
  ]);
  console.error("[ERROR]", {
    context,
    statusCode,
    category: knownNames.has(error?.name) ? error.name : "ApplicationError",
    ...(Number.isSafeInteger(error?.code) ? { databaseCode: error.code } : {}),
  });
};

module.exports = { logError };

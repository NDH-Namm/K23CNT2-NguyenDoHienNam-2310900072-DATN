const { randomUUID } = require("node:crypto");
const { setTimeout: delay } = require("node:timers/promises");
const Lock = require("./user-mutation-lock.model");
const createError = require("../../utils/app-error");
const { logError } = require("../../utils/logger");

const LOCK_ID = "users-mutations";
const writeOptions = { writeConcern: { w: "majority" } };

const knownRejectedWrite = (error) => !error.writeConcernError && (
  error.code === 11000 || ["ValidationError", "CastError", "ZodError"].includes(error.name)
);

const withUserMutationLock = async (operation, { timeoutMs = 2000, retryMs = 25 } = {}) => {
  const owner = randomUUID();
  const deadline = Date.now() + timeoutMs;

  // _id duy nhất là điểm đồng bộ giữa mọi tiến trình Node, cả trên standalone.
  while (true) {
    try {
      const acquired = await Lock.collection.insertOne({
        _id: LOCK_ID, owner, acquiredAt: new Date(),
      }, writeOptions);
      if (!acquired.acknowledged) throw new Error("Unacknowledged lock acquisition");
      break;
    } catch (error) {
      if (error.code !== 11000) {
        logError(error, "users-lock-acquire");
        throw createError("Không xác nhận được khóa ghi người dùng. Vui lòng liên hệ quản trị hệ thống.",
          503, "USER_LOCK_UNAVAILABLE");
      }
      if (Date.now() >= deadline) {
        throw createError("Đang có thao tác cập nhật người dùng. Vui lòng thử lại sau.",
          503, "USER_MUTATION_BUSY");
      }
      await delay(retryMs);
    }
  }

  let uncertainWrite = false;
  const write = async (action) => {
    uncertainWrite = true;
    try {
      const result = await action();
      if (result?.acknowledged === false) throw new Error("Unacknowledged user mutation");
      uncertainWrite = false;
      return result;
    } catch (error) {
      if (knownRejectedWrite(error)) uncertainWrite = false;
      throw error;
    }
  };

  let result;
  let operationError;
  let failed = false;
  try {
    result = await operation(write);
  } catch (error) {
    if (uncertainWrite) {
      logError(error, "users-write-uncertain");
      throw createError("Chưa xác định được kết quả cập nhật. Khóa ghi được giữ lại để kiểm tra an toàn.",
        503, "USER_WRITE_UNCERTAIN");
    }
    operationError = error;
    failed = true;
  }

  // Nhánh ghi không xác định đã thoát ở trên và giữ khóa. Chỉ giải phóng
  // khi thao tác đã hoàn thành hoặc thất bại chắc chắn trước khi ghi.
  try {
    const released = await Lock.collection.deleteOne({ _id: LOCK_ID, owner }, writeOptions);
    if (!released.acknowledged || released.deletedCount !== 1) {
      throw new Error("Lock ownership was lost");
    }
  } catch (error) {
    logError(error, "users-lock-release");
    throw createError("Không xác nhận được việc giải phóng khóa ghi. Vui lòng liên hệ quản trị hệ thống.",
      503, "USER_LOCK_RELEASE_FAILED");
  }

  if (failed) throw operationError;
  return result;
};

module.exports = { withUserMutationLock, LOCK_ID };

const mongoose = require("mongoose");

// Khóa không có TTL: hết hạn giữa một lần ghi có thể phá vỡ bất biến Admin.
// Chỉ được tạo khi API ghi Users chạy, không tạo/migrate khi import module.
const schema = new mongoose.Schema({
  _id: String,
  owner: { type: String, required: true },
  acquiredAt: { type: Date, required: true },
}, {
  collection: "system_locks",
  versionKey: false,
  autoCreate: false,
  autoIndex: false,
});

module.exports = mongoose.model("UserMutationLock", schema);


// Import trong test không đọc .env và không tự kết nối database.
if (require.main === module) require("dotenv").config();

const app = require("./app");
const connectDatabase = require("./config/database");
const { logError } = require("./utils/logger");
const mongoose = require("mongoose");

const startServer = async ({ port = Number(process.env.PORT || 5000), host } = {}) => {
  // Chỉ mở HTTP sau khi kết nối database thành công.
  await connectDatabase();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host);
    server.once("error", reject);
    server.once("listening", () => {
      server.removeListener("error", reject);
      const actualPort = server.address().port;
      console.log("----------------------------------");
      console.log("DEVMaster Backend Started");
      console.log(`Server: http://localhost:${actualPort}`);
      console.log(`API: http://localhost:${actualPort}/api/v1`);
      console.log("----------------------------------");
      resolve(server);
    });
  });
};

if (require.main === module) {
  startServer().catch(async (error) => {
    logError(error, "server-start");
    // Ví dụ cổng đã được sử dụng: đóng kết nối vừa mở để tiến trình thoát.
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      logError(disconnectError, "server-start-cleanup");
    }
    process.exitCode = 1;
  });
}

module.exports = { startServer };

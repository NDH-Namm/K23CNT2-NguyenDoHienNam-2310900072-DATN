
require("dotenv").config();

const app = require("./app");
const connectDatabase = require("./config/database");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Kết nối Database trước
    await connectDatabase();

    // Khởi động Express Server
    app.listen(PORT, () => {
      console.log("----------------------------------");
      console.log("DEVMaster Backend Started");
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`API: http://localhost:${PORT}/api/v1`);
      console.log("----------------------------------");
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();

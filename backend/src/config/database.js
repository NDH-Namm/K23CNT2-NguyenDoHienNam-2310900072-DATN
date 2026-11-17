
const mongoose = require("mongoose");
const { logError } = require("../utils/logger");

const connectDatabase = async () => {
  try {
    const connection = await mongoose.connect(
      process.env.MONGODB_URI
    );

    console.log(
      `MongoDB connected: ${connection.connection.host}`
    );

    console.log(
      `Database name: ${connection.connection.name}`
    );
  } catch (error) {
    logError(error, "database-connect");
    // Để caller quyết định cách dừng; không kết thúc tiến trình giữa luồng xử lý.
    throw error;
  }
};

module.exports = connectDatabase;

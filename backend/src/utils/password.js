
const bcrypt = require("bcrypt");
const { newPasswordSchema } = require("../validators/password.validator");

const SALT_ROUNDS = 12;

// Mã hóa mật khẩu
const hashPassword = async (password) => {
  return await bcrypt.hash(newPasswordSchema.parse(password), SALT_ROUNDS);
};

// Kiểm tra mật khẩu
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};

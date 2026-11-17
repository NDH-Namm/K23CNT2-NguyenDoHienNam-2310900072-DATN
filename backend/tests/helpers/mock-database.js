const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Không đọc .env. Mọi đường mở kết nối MongoDB đều bị chặn trong tiến trình test.
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/devmaster_test_disabled";
process.env.JWT_SECRET = randomBytes(48).toString("hex");
process.env.JWT_EXPIRES_IN = "1h";
mongoose.set("bufferCommands", false);
const blockConnection = () => { throw new Error("Test không được kết nối MongoDB."); };
mongoose.connect = blockConnection;
mongoose.createConnection = blockConnection;
mongoose.Connection.prototype.openUri = blockConnection;
mongoose.mongo.MongoClient.prototype.connect = blockConnection;

const User = require("../../src/modules/users/user.model");
const Lock = require("../../src/modules/users/user-mutation-lock.model");
const TEST_PASSWORD = "OldPassword123!";
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 4);
const IDS = {
  admin: "abcdef000000000000000001",
  second: "abcdef000000000000000002",
  manager: "abcdef000000000000000003",
  warehouse: "abcdef000000000000000004",
  employee: "abcdef000000000000000005",
};

const userFixture = (id = IDS.admin, overrides = {}) => ({
  _id: id, employeeCode: `TEST-${id.slice(-6)}`, fullName: "Tài khoản kiểm thử",
  email: `test-${id.slice(-6)}@example.invalid`, password: TEST_HASH,
  role: "admin", status: "active", isDeleted: false, mustChangePassword: false,
  ...overrides,
});

const equal = (a, b) => a instanceof mongoose.Types.ObjectId || b instanceof mongoose.Types.ObjectId
  ? String(a).toLowerCase() === String(b).toLowerCase() : a === b;

const matches = (record, filter) => Object.entries(filter).every(([key, value]) => {
  if (key === "$or") return value.some((part) => matches(record, part));
  if (key === "$and") return value.every((part) => matches(record, part));
  if (value instanceof RegExp) return value.test(record[key] || "");
  if (value && typeof value === "object" && Object.hasOwn(value, "$exists")) {
    return Object.hasOwn(record, key) === value.$exists;
  }
  if (key === "_id") return String(record[key]).toLowerCase() === String(value).toLowerCase();
  return equal(record[key], value);
});

const duplicateError = (field) => Object.assign(new Error("Giá trị nhạy cảm giả trong lỗi MongoDB"), {
  name: "MongoServerError", code: 11000, keyPattern: { [field]: 1 },
});

const mockDatabase = (t, initialUsers = []) => {
  const records = new Map(initialUsers.map((row) => [String(row._id), structuredClone(row)]));
  const state = { records, lock: null, lockAttempts: 0, writes: 0, writeFailure: null,
    applyThenFail: false, lockReleaseFailure: null };

  const project = (record, selection = "", lean = false) => {
    if (!record) return null;
    const copy = structuredClone(record);
    if (!selection.includes("+password")) delete copy.password;
    if (!selection.includes("+tokenVersion")) delete copy.tokenVersion;
    return lean ? copy : User.hydrate(copy);
  };

  const query = (filter, multiple) => {
    let selection = "";
    let lean = false;
    let skip = 0;
    let limit = Infinity;
    const chain = {
      select(value) { selection = value; return this; },
      lean() { lean = true; return this; },
      sort() { return this; },
      skip(value) { skip = value; return this; },
      limit(value) { limit = value; return this; },
      // Mongoose Query là thenable; mock cần giữ đúng hành vi await/select/lean.
      // eslint-disable-next-line unicorn/no-thenable
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          const rows = [...records.values()].filter((row) => matches(row, filter));
          return multiple ? rows.slice(skip, skip + limit).map((row) => project(row, selection, lean))
            : project(rows[0], selection, lean);
        }).then(resolve, reject);
      },
    };
    return chain;
  };

  const validateUnique = (candidate) => {
    for (const row of records.values()) {
      if (String(row._id) === String(candidate._id)) continue;
      for (const field of ["email", "employeeCode"]) {
        if (row[field] === candidate[field]) throw duplicateError(field);
      }
    }
  };

  const mutate = async (filter, update, options, returnDocument) => {
    // Nhường event loop để các request đọc cùng snapshot trong bài test đồng thời.
    await new Promise((resolve) => setImmediate(resolve));
    if (state.writeFailure && !state.applyThenFail) throw state.writeFailure;
    const old = [...records.values()].find((row) => matches(row, filter));
    if (!old) return returnDocument ? null : { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    const next = { ...old, ...update.$set };
    for (const [field, value] of Object.entries(update.$inc || {})) next[field] = (old[field] || 0) + value;
    if (options?.runValidators) await new User(next).validate();
    validateUnique(next);
    records.set(String(old._id), next);
    state.writes++;
    if (state.writeFailure) throw state.writeFailure;
    return returnDocument ? project(next) : { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  };

  t.mock.method(User, "findOne", (filter) => query(filter, false));
  t.mock.method(User, "find", (filter) => query(filter, true));
  t.mock.method(User, "countDocuments", async (filter) => [...records.values()].filter((row) => matches(row, filter)).length);
  t.mock.method(User, "updateOne", (filter, update, options) => mutate(filter, update, options, false));
  t.mock.method(User, "findOneAndUpdate", (filter, update, options) => mutate(filter, update, options, true));
  t.mock.method(User, "create", async (documents) => {
    if (state.writeFailure) throw state.writeFailure;
    const result = [];
    for (const input of documents) {
      const document = new User(input);
      await document.validate();
      const record = document.toObject({ transform: false });
      record._id = String(document._id);
      validateUnique(record);
      records.set(record._id, record);
      state.writes++;
      result.push(document);
    }
    return result;
  });

  // Mô phỏng _id unique và ghi nguyên tử của MongoDB; không mutex JavaScript.
  t.mock.method(Lock.collection, "insertOne", async (document) => {
    state.lockAttempts++;
    if (state.lock) throw duplicateError("_id");
    state.lock = { ...document };
    return { acknowledged: true, insertedId: document._id };
  });
  t.mock.method(Lock.collection, "deleteOne", async (filter) => {
    if (state.lockReleaseFailure) throw state.lockReleaseFailure;
    if (!state.lock || !matches(state.lock, filter)) return { acknowledged: true, deletedCount: 0 };
    state.lock = null;
    return { acknowledged: true, deletedCount: 1 };
  });

  state.activeAdmins = () => [...records.values()].filter((row) =>
    row.role === "admin" && row.status === "active" && !row.isDeleted).length;
  return state;
};

module.exports = { User, Lock, IDS, TEST_PASSWORD, TEST_HASH, userFixture, mockDatabase, duplicateError };

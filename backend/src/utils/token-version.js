const getTokenVersion = (user) => user.tokenVersion === undefined ? 0 : user.tokenVersion;

const isValidTokenVersion = (version) => Number.isSafeInteger(version) && version >= 0;

const tokenVersionFilter = (version) => version === 0
  ? { $or: [{ tokenVersion: 0 }, { tokenVersion: { $exists: false } }] }
  : { tokenVersion: version };

module.exports = { getTokenVersion, isValidTokenVersion, tokenVersionFilter };

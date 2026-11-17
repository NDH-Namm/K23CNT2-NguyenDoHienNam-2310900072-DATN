const { z } = require("zod");

const MAX_PAGE = 100000;
const MAX_LIMIT = 100;

const positiveInteger = (maximum, label) => z.union([
  z.string().max(16).regex(/^\d+$/),
  z.number(),
]).transform(Number).pipe(z.number().int().min(1).max(maximum, {
  message: `${label} không được vượt quá ${maximum}.`,
}));

const paginationSchema = z.object({
  page: positiveInteger(MAX_PAGE, "Số trang").default(1),
  limit: positiveInteger(MAX_LIMIT, "Số bản ghi mỗi trang").default(10),
});

module.exports = { paginationSchema };

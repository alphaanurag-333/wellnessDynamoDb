const { resolveMediaFields } = require("../../utils/s3");

function resolveListMedia(data, listKey, fields) {
  if (!data || !Array.isArray(data[listKey])) return data;
  return {
    ...data,
    [listKey]: data[listKey].map((row) =>
      row ? resolveMediaFields({ ...row }, fields) : row
    ),
  };
}

module.exports = { resolveListMedia };

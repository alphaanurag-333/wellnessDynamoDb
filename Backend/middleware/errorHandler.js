const config = require("../config");
const { multerFileSizeErrorMessage } = require("../utils/mediaUploadLimits");

function isPayloadTooLarge(err) {
  return (
    err?.name === "PayloadTooLargeError" ||
    err?.type === "entity.too.large" ||
    Number(err?.status) === 413 ||
    Number(err?.statusCode) === 413
  );
}

exports.errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  if (!err.statusCode && err.name === "MulterError") {
    statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    err.message = multerFileSizeErrorMessage(err);
  }
  if (err.name !== "MulterError" && isPayloadTooLarge(err)) {
    statusCode = 413;
    err.message =
      "Page content is too large. Pasting from Word adds extra formatting. Paste as plain text, or copy from a clean HTML/CKEditor source.";
  }
  const payload = {
    status: false,
    message: err.message || "Internal Server Error",
  };

  if (err.retryAfterSeconds != null) {
    payload.retryAfterSeconds = err.retryAfterSeconds;
  }
  if (err.cooldownUntil) {
    payload.cooldownUntil = err.cooldownUntil;
  }
  if (err.code) {
    payload.code = err.code;
  }

  if (config.nodeEnv === "development" && err.stack) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

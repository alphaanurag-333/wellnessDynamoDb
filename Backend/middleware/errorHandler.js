const config = require("../config");
const { multerFileSizeErrorMessage } = require("../utils/mediaUploadLimits");

exports.errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  if (!err.statusCode && err.name === "MulterError") {
    statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    err.message = multerFileSizeErrorMessage(err);
  }
  const payload = {
    status: err.status || false,
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

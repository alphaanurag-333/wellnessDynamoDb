const AppError = require("../utils/AppError");

const REVIEW_MIN = 3;
const REVIEW_MAX = 500;
const NAME_MAX = 35;

function readIdParam(req) {
  return String(req.params.id || req.params.testimonialId || "").trim();
}

function validateName(name) {
  const value = String(name ?? "").trim();
  if (!value) throw new AppError("name is required", 400);
  if (value.length > NAME_MAX) throw new AppError(`name cannot exceed ${NAME_MAX} characters`, 400);
  return value;
}

function validateReview(review) {
  const value = String(review ?? "").trim();
  if (!value) throw new AppError("review is required", 400);
  if (value.length < REVIEW_MIN) throw new AppError(`review must be at least ${REVIEW_MIN} characters`, 400);
  if (value.length > REVIEW_MAX) {
    throw new AppError(`review cannot exceed ${REVIEW_MAX} characters`, 400);
  }
  return value;
}

function validateStars(stars) {
  const num = Number(stars);
  if (!Number.isFinite(num) || num < 1 || num > 5) {
    throw new AppError("stars must be a number between 1 and 5", 400);
  }
  return Math.round(num);
}

function validateHealthConcernId(healthConcernId) {
  const id = String(healthConcernId || "").trim();
  if (!id) throw new AppError("healthConcernId is required", 400);
  return id;
}

function validateStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (!["active", "inactive"].includes(value)) {
    throw new AppError("status must be active or inactive", 400);
  }
  return value;
}

module.exports = {
  REVIEW_MIN,
  REVIEW_MAX,
  NAME_MAX,
  readIdParam,
  validateName,
  validateReview,
  validateStars,
  validateHealthConcernId,
  validateStatus,
};

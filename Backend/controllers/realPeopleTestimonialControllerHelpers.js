const AppError = require("../utils/AppError");
const { getUserById } = require("../models/userModel");

const REVIEW_MAX = 500;

function readIdParam(req) {
  return String(req.params.id || req.params.testimonialId || "").trim();
}

function validateReview(review) {
  const value = String(review ?? "").trim();
  if (!value) throw new AppError("review is required", 400);
  if (value.length < 5) throw new AppError("review must be at least 5 characters", 400);
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

async function validateUserId(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new AppError("userId is required", 400);
  const user = await getUserById(id);
  if (!user) throw new AppError("User not found", 400);
  return id;
}

function validateStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (!["active", "inactive"].includes(value)) {
    throw new AppError("status must be active or inactive", 400);
  }
  return value;
}

function validateApprovalStatus(approvalStatus) {
  const value = String(approvalStatus || "").trim().toLowerCase();
  if (!["pending", "approved", "rejected"].includes(value)) {
    throw new AppError("approvalStatus must be pending, approved, or rejected", 400);
  }
  return value;
}

function assertCoachCanManageTestimonial(record, { coachId, assistantId } = {}) {
  const managedByCoachId = String(record?.managedByCoachId || "").trim();
  const assignedCoachType = String(record?.assignedCoachType || "").trim();
  const assignedCoachId = String(record?.assignedCoachId || "").trim();

  if (assistantId) {
    if (
      assignedCoachType === "assistant_wellness_coach" &&
      assignedCoachId === String(assistantId)
    ) {
      return;
    }
    throw new AppError("Testimonial is not assigned to you", 403);
  }

  if (coachId && managedByCoachId === String(coachId)) return;
  throw new AppError("Testimonial is not under your coaching hierarchy", 403);
}

function readTestimonialUserId(record) {
  return String(record?.userId || record?.submittedByUserId || "").trim();
}

module.exports = {
  REVIEW_MAX,
  readIdParam,
  validateReview,
  validateStars,
  validateUserId,
  validateStatus,
  validateApprovalStatus,
  assertCoachCanManageTestimonial,
  readTestimonialUserId,
};

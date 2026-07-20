const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById } = require("../../models/userModel");
const {
  createClientTestimonial,
  getClientTestimonialById,
  getClientTestimonialRecordById,
  getClientTestimonialByUserId,
  updateClientTestimonial,
  deleteClientTestimonial,
  listClientTestimonials,
} = require("../../models/clientTestimonials");
const { deleteStoredMedia, normalizeStoredMedia } = require("../../utils/s3");
const { readProfileImageKey } = require("../../utils/mediaFieldAliases");
const { resolveAssignedCoachForUser } = require("../mealTrackingControllerHelpers");

const DESCRIPTION_MAX = 255;

function readIdParam(req) {
  return String(req.params.id || req.params.testimonialId || "").trim();
}

function validateRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new AppError("rating must be a number between 1 and 5", 400);
  }
  return Math.round(rating);
}

function validateDescription(value) {
  const description = String(value || "").trim();
  if (!description) throw new AppError("description is required", 400);
  if (description.length > DESCRIPTION_MAX) {
    throw new AppError(`description cannot exceed ${DESCRIPTION_MAX} characters`, 400);
  }
  return description;
}

function assertOwner(record, userId) {
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Client testimonial not found", 404);
  }
}

function isActiveStatus(status) {
  return String(status || "").toLowerCase() === "active";
}

/** Only delete media uploaded under client-testimonials/, never the user's own profile image. */
async function deleteOwnedTestimonialImage(profileImageKey) {
  const key = String(profileImageKey || "").trim();
  if (!key || !key.startsWith("client-testimonials/")) return;
  await deleteStoredMedia(key);
}

function resolveUserProfileImageKey(user) {
  const raw = user?.profileImage || user?.profile_image;
  if (!raw) return "";
  try {
    return normalizeStoredMedia(String(raw).trim()) || "";
  } catch {
    return "";
  }
}

exports.listUserClientTestimonialsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const { page = 1, limit = 20 } = req.query;
  const data = await listClientTestimonials({
    page,
    limit,
    userId,
  });

  return res.status(200).json({
    status: true,
    clientTestimonials: data.clientTestimonials,
    pagination: data.pagination,
  });
});

/** Convenience: current user's single review (or null). */
exports.getMyClientTestimonialController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const clientTestimonial = await getClientTestimonialByUserId(userId);
  return res.status(200).json({
    status: true,
    clientTestimonial,
  });
});

exports.getUserClientTestimonialByIdController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const testimonial = await getClientTestimonialById(readIdParam(req));
  assertOwner(testimonial, userId);

  return res.status(200).json({ status: true, clientTestimonial: testimonial });
});

exports.createUserClientTestimonialController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = req.user || (await getUserById(userId));
  if (!user) throw new AppError("User not found", 404);

  const existing = await getClientTestimonialByUserId(userId);
  if (existing) {
    throw new AppError(
      "You already have a review. Update or delete it before submitting a new one.",
      409
    );
  }

  const description = validateDescription(req.body.description ?? req.body.review);
  const rating = validateRating(req.body.rating ?? req.body.stars);
  const coachAssignment = resolveAssignedCoachForUser(user);
  const name = String(user.name || "").trim() || "Member";
  const profileImage = resolveUserProfileImageKey(user);

  const testimonial = await createClientTestimonial({
    name,
    rating,
    description,
    profileImage: profileImage || undefined,
    status: "inactive",
    userId,
    managedByCoachId: coachAssignment.coachId || null,
    assignedCoachType: coachAssignment.assignedCoachType || null,
    assignedCoachId: coachAssignment.assignedCoachId || null,
    submittedByRole: "user",
  });

  return res.status(201).json({
    status: true,
    message: "Review submitted. It will appear publicly once activated by your coach or admin.",
    clientTestimonial: testimonial,
  });
});

exports.updateUserClientTestimonialController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const current = await getClientTestimonialRecordById(id);
  assertOwner(current, userId);

  if (isActiveStatus(current.status)) {
    throw new AppError(
      "Published reviews cannot be edited. Delete it to submit a new review, or ask your coach to unpublish it.",
      400
    );
  }

  const updates = {};
  if (req.body.description !== undefined || req.body.review !== undefined) {
    updates.description = validateDescription(req.body.description ?? req.body.review);
  }
  if (req.body.rating !== undefined || req.body.stars !== undefined) {
    updates.rating = validateRating(req.body.rating ?? req.body.stars);
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("Only description and rating can be updated", 400);
  }

  const clientTestimonial = await updateClientTestimonial(id, updates);
  return res.status(200).json({
    status: true,
    message: "Review updated",
    clientTestimonial,
  });
});

exports.deleteUserClientTestimonialController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const current = await getClientTestimonialRecordById(id);
  assertOwner(current, userId);

  await deleteOwnedTestimonialImage(readProfileImageKey(current));
  await deleteClientTestimonial(id);

  return res.status(200).json({
    status: true,
    message: "Review deleted successfully. You can submit a new review now.",
  });
});

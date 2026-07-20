const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { deleteStoredMedia } = require("../../utils/s3");
const { readProfileImageKey } = require("../../utils/mediaFieldAliases");
const {
  getClientTestimonialById,
  getClientTestimonialRecordById,
  updateClientTestimonial,
  deleteClientTestimonial,
  listClientTestimonials,
} = require("../../models/clientTestimonials");

const ALLOWED_STATUS = ["active", "inactive"];

async function deleteOwnedTestimonialImage(profileImageKey) {
  const key = String(profileImageKey || "").trim();
  if (!key || !key.startsWith("client-testimonials/")) return;
  await deleteStoredMedia(key);
}

exports.listClientTestimonialsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const data = await listClientTestimonials({ page, limit, status, search });

  return res.status(200).json({
    status: true,
    clientTestimonials: data.clientTestimonials,
    pagination: data.pagination,
  });
});

exports.getClientTestimonialByIdController = asyncHandler(async (req, res) => {
  const clientTestimonial = await getClientTestimonialById(req.params.id);
  if (!clientTestimonial) throw new AppError("Client testimonial not found", 404);

  return res.status(200).json({
    status: true,
    clientTestimonial,
  });
});

/** Client testimonials are user-submitted only. */
exports.createClientTestimonialController = asyncHandler(async () => {
  throw new AppError(
    "Admin cannot create client testimonials. Only users can submit reviews.",
    410
  );
});

exports.updateClientTestimonialController = asyncHandler(async (req, res) => {
  const current = await getClientTestimonialRecordById(req.params.id);
  if (!current) throw new AppError("Client testimonial not found", 404);

  const updates = {};

  if (req.body.description !== undefined) {
    const description = String(req.body.description || "").trim();
    if (!description) throw new AppError("description cannot be empty", 400);
    updates.description = description;
  }

  if (req.body.rating !== undefined) {
    const rating = Number(req.body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new AppError("rating must be a number between 1 and 5", 400);
    }
    updates.rating = rating;
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("Only description, rating, and status can be updated", 400);
  }

  let clientTestimonial;
  try {
    clientTestimonial = await updateClientTestimonial(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Client testimonial not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Client testimonial updated successfully",
    clientTestimonial,
  });
});

exports.deleteClientTestimonialController = asyncHandler(async (req, res) => {
  const current = await getClientTestimonialRecordById(req.params.id);
  if (!current) throw new AppError("Client testimonial not found", 404);
  await deleteOwnedTestimonialImage(readProfileImageKey(current));

  try {
    await deleteClientTestimonial(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Client testimonial not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Client testimonial deleted successfully",
  });
});

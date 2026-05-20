const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  createClientTestimonial,
  getClientTestimonialById,
  getClientTestimonialRecordById,
  updateClientTestimonial,
  deleteClientTestimonial,
  listClientTestimonials,
  normalizeStatus,
} = require("../../models/clientTestimonials");

const ALLOWED_STATUS = ["active", "inactive"];
const S3_FOLDER = "client-testimonials";

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

exports.createClientTestimonialController = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const description = String(req.body.description || "").trim();
  const rating = Number(req.body.rating);
  const status = normalizeStatus(req.body.status, "active");

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  const profile_image =
    uploadedKey ?? parseMediaKeyFromBody(req.body.profile_image, "profile_image");

  if (!name) throw new AppError("name is required", 400);
  if (!description) throw new AppError("description is required", 400);
  if (!profile_image) throw new AppError("profile_image is required", 400);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new AppError("rating must be a number between 1 and 5", 400);
  }
  if (!ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  const clientTestimonial = await createClientTestimonial({
    name,
    rating,
    description,
    profile_image,
    status,
  });

  return res.status(201).json({
    status: true,
    message: "Client testimonial created successfully",
    clientTestimonial,
  });
});

exports.updateClientTestimonialController = asyncHandler(async (req, res) => {
  const current = await getClientTestimonialRecordById(req.params.id);
  if (!current) throw new AppError("Client testimonial not found", 404);

  const updates = {};

  if (req.body.name !== undefined) {
    const name = String(req.body.name || "").trim();
    if (!name) throw new AppError("name cannot be empty", 400);
    updates.name = name;
  }
  if (req.body.description !== undefined) {
    const description = String(req.body.description || "").trim();
    if (!description) throw new AppError("description cannot be empty", 400);
    updates.description = description;
  }
  if (req.body.profile_image !== undefined) {
    const profile_image = parseMediaKeyFromBody(req.body.profile_image, "profile_image");
    if (profile_image === null && current.profile_image) {
      await deleteStoredMedia(current.profile_image);
    }
    if (profile_image === null) {
      throw new AppError("profile_image cannot be empty", 400);
    }
    updates.profile_image = profile_image;
  }

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (uploadedKey) {
    if (current.profile_image && current.profile_image !== uploadedKey) {
      await deleteStoredMedia(current.profile_image);
    }
    updates.profile_image = uploadedKey;
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
    throw new AppError("At least one field is required for update", 400);
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
  if (current.profile_image) await deleteStoredMedia(current.profile_image);

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

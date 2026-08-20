const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  readProfileImageKey,
  parseProfileImageFromBody,
} = require("../../utils/mediaFieldAliases");
const {
  createProgramTestimonial,
  getProgramTestimonialById,
  getProgramTestimonialRecordById,
  updateProgramTestimonial,
  deleteProgramTestimonial,
  listProgramTestimonials,
  reorderProgramTestimonials,
  normalizeStatus,
  normalizeType,
  normalizeSortOrder,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
} = require("../../models/programTestimonialModel");

const ALLOWED_STATUS = ["active", "inactive"];
const S3_FOLDER = "program-testimonials";

function validateSortOrder(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < SORT_ORDER_MIN || n > SORT_ORDER_MAX || Math.floor(n) !== n) {
    throw new AppError(
      `sortOrder must be a whole number between ${SORT_ORDER_MIN} and ${SORT_ORDER_MAX}`,
      400,
    );
  }
  return normalizeSortOrder(n);
}

exports.listProgramTestimonialsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, type, search } = req.query;
  const data = await listProgramTestimonials({ page, limit, status, type, search });

  return res.status(200).json({
    status: true,
    programTestimonials: data.programTestimonials,
    pagination: data.pagination,
  });
});

exports.getProgramTestimonialByIdController = asyncHandler(async (req, res) => {
  const programTestimonial = await getProgramTestimonialById(req.params.id);
  if (!programTestimonial) throw new AppError("Program testimonial not found", 404);

  return res.status(200).json({
    status: true,
    programTestimonial,
  });
});

exports.createProgramTestimonialController = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const description = String(req.body.description || "").trim();
  const status = normalizeStatus(req.body.status, "active");
  const sortOrder = validateSortOrder(req.body.sortOrder);

  let type;
  try {
    type = normalizeType(req.body.type);
  } catch (err) {
    throw new AppError(err.message || "type is required", 400);
  }

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  const profileImageRaw = parseProfileImageFromBody(req.body);
  const profileImage =
    uploadedKey ??
    (profileImageRaw !== undefined
      ? parseMediaKeyFromBody(profileImageRaw, "profileImage")
      : undefined);

  if (!name) throw new AppError("name is required", 400);
  if (!description) throw new AppError("description is required", 400);
  if (!profileImage) throw new AppError("profileImage is required", 400);
  if (!ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  const programTestimonial = await createProgramTestimonial({
    name,
    description,
    profileImage,
    type,
    status,
    sortOrder,
  });

  return res.status(201).json({
    status: true,
    message: "Program testimonial created successfully",
    programTestimonial,
  });
});

exports.updateProgramTestimonialController = asyncHandler(async (req, res) => {
  const current = await getProgramTestimonialRecordById(req.params.id);
  if (!current) throw new AppError("Program testimonial not found", 404);

  const updates = {};
  const currentProfileImage = readProfileImageKey(current);

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
  if (req.body.type !== undefined) {
    try {
      updates.type = normalizeType(req.body.type);
    } catch (err) {
      throw new AppError(err.message || "type is required", 400);
    }
  }
  if (req.body.sortOrder !== undefined) {
    updates.sortOrder = validateSortOrder(req.body.sortOrder);
  }

  const profileImageRaw = parseProfileImageFromBody(req.body);
  if (profileImageRaw !== undefined) {
    const profileImage = parseMediaKeyFromBody(profileImageRaw, "profileImage");
    if (profileImage === null && currentProfileImage) {
      await deleteStoredMedia(currentProfileImage);
    }
    if (profileImage === null) {
      throw new AppError("profileImage cannot be empty", 400);
    }
    updates.profileImage = profileImage;
  }

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (uploadedKey) {
    if (currentProfileImage && currentProfileImage !== uploadedKey) {
      await deleteStoredMedia(currentProfileImage);
    }
    updates.profileImage = uploadedKey;
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

  let programTestimonial;
  try {
    programTestimonial = await updateProgramTestimonial(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Program testimonial not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Program testimonial updated successfully",
    programTestimonial,
  });
});

exports.reorderProgramTestimonialsController = asyncHandler(async (req, res) => {
  const orderedIds = req.body.orderedIds ?? req.body.order ?? req.body.ids;
  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    throw new AppError("orderedIds must be a non-empty array", 400);
  }

  try {
    const programTestimonials = await reorderProgramTestimonials(orderedIds);
    return res.status(200).json({
      status: true,
      message: "Program testimonials reordered",
      programTestimonials,
    });
  } catch (err) {
    if (err?.statusCode === 404 || String(err.message || "").startsWith("Program testimonial not found")) {
      throw new AppError(err.message || "Program testimonial not found", 404);
    }
    if (err?.message === "orderedIds must be unique" || err?.message === "orderedIds is required") {
      throw new AppError(err.message, 400);
    }
    throw err;
  }
});

exports.deleteProgramTestimonialController = asyncHandler(async (req, res) => {
  const current = await getProgramTestimonialRecordById(req.params.id);
  if (!current) throw new AppError("Program testimonial not found", 404);
  const profileImage = readProfileImageKey(current);
  if (profileImage) await deleteStoredMedia(profileImage);

  try {
    await deleteProgramTestimonial(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Program testimonial not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Program testimonial deleted successfully",
  });
});

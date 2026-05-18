const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { publicUploadPathFromFile } = require("../../utils/publicUploadPath");
const { deleteUploadFileByPublicUrl } = require("../../utils/deleteUploadFile");
const {
  createWellnessCoach,
  getWellnessCoachById,
  getWellnessCoachByEmail,
  getWellnessCoachByPhone,
  updateWellnessCoach,
  deleteWellnessCoach,
  listWellnessCoaches,
  normalizeStatus,
  ALLOWED_STATUS,
} = require("../../models/wellnessCoachModel");
const { countAssistantsByWellnessCoachId } = require("../../models/assistantWellnessCoachModel");
const { normalizeEmail, normalizePhone, normalizeCountryCode } = require("../../models/userModel");

async function assertUniqueCoachEmail(email, excludeId) {
  const existing = await getWellnessCoachByEmail(email);
  if (existing && existing.id !== excludeId) {
    throw new AppError("A wellness coach already exists with this email", 409);
  }
}

async function assertUniqueCoachPhone(phoneCountryCode, phone, excludeId) {
  const existing = await getWellnessCoachByPhone(phoneCountryCode, phone);
  if (existing && existing.id !== excludeId) {
    throw new AppError("A wellness coach already exists with this phone number", 409);
  }
}

function parseCoachBody(body) {
  const name = String(body.name ?? "").trim();
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const phoneCountryCode = normalizeCountryCode(body.phoneCountryCode);

  if (!name) throw new AppError("name is required", 400);
  if (!email) throw new AppError("email is required", 400);
  if (!phone) throw new AppError("phone is required", 400);

  const status = body.status !== undefined ? normalizeStatus(body.status) : "active";
  if (body.status !== undefined && !ALLOWED_STATUS.has(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  return {
    name,
    email,
    phone,
    phoneCountryCode,
    bio: body.bio !== undefined ? String(body.bio || "").trim() || null : null,
    specialization:
      body.specialization !== undefined ? String(body.specialization || "").trim() || null : null,
    country: body.country !== undefined ? String(body.country || "").trim() || null : null,
    state: body.state !== undefined ? String(body.state || "").trim() || null : null,
    city: body.city !== undefined ? String(body.city || "").trim() || null : null,
    profileImage:
      body.profileImage !== undefined ? String(body.profileImage || "").trim() || null : null,
    status,
  };
}

exports.listWellnessCoachesController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const data = await listWellnessCoaches({ page, limit, status, search });
  return res.status(200).json({
    status: true,
    wellnessCoaches: data.wellnessCoaches,
    pagination: data.pagination,
  });
});

exports.getWellnessCoachByIdController = asyncHandler(async (req, res) => {
  const coach = await getWellnessCoachById(req.params.id);
  if (!coach) throw new AppError("Wellness coach not found", 404);
  return res.status(200).json({ status: true, wellnessCoach: coach });
});

exports.createWellnessCoachController = asyncHandler(async (req, res) => {
  const fields = parseCoachBody(req.body);
  await assertUniqueCoachEmail(fields.email);
  await assertUniqueCoachPhone(fields.phoneCountryCode, fields.phone);

  const uploaded = publicUploadPathFromFile(req, "wellness-coach");
  if (uploaded) fields.profileImage = uploaded;

  const coach = await createWellnessCoach(fields);
  return res.status(201).json({
    status: true,
    message: "Wellness coach created successfully",
    wellnessCoach: coach,
  });
});

exports.updateWellnessCoachController = asyncHandler(async (req, res) => {
  const current = await getWellnessCoachById(req.params.id);
  if (!current) throw new AppError("Wellness coach not found", 404);

  const updates = {};
  const body = req.body || {};

  if (body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) throw new AppError("name cannot be empty", 400);
    updates.name = name;
  }
  if (body.email !== undefined) {
    const email = normalizeEmail(body.email);
    if (!email) throw new AppError("email cannot be empty", 400);
    await assertUniqueCoachEmail(email, current.id);
    updates.email = email;
  }
  if (body.phone !== undefined) {
    const phone = normalizePhone(body.phone);
    if (!phone) throw new AppError("phone cannot be empty", 400);
    const phoneCountryCode =
      body.phoneCountryCode !== undefined
        ? normalizeCountryCode(body.phoneCountryCode)
        : current.phoneCountryCode;
    await assertUniqueCoachPhone(phoneCountryCode, phone, current.id);
    updates.phone = phone;
    if (body.phoneCountryCode !== undefined) updates.phoneCountryCode = phoneCountryCode;
  } else if (body.phoneCountryCode !== undefined) {
    updates.phoneCountryCode = normalizeCountryCode(body.phoneCountryCode);
    await assertUniqueCoachPhone(updates.phoneCountryCode, current.phone, current.id);
  }
  if (body.status !== undefined) {
    const status = normalizeStatus(body.status);
    if (!ALLOWED_STATUS.has(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (body.bio !== undefined) updates.bio = String(body.bio || "").trim() || null;
  if (body.specialization !== undefined) {
    updates.specialization = String(body.specialization || "").trim() || null;
  }
  if (body.country !== undefined) updates.country = String(body.country || "").trim() || null;
  if (body.state !== undefined) updates.state = String(body.state || "").trim() || null;
  if (body.city !== undefined) updates.city = String(body.city || "").trim() || null;

  const uploaded = publicUploadPathFromFile(req, "wellness-coach");
  if (uploaded) {
    if (current.profileImage) deleteUploadFileByPublicUrl(current.profileImage);
    updates.profileImage = uploaded;
  } else if (body.profileImage !== undefined) {
    if ((body.profileImage === null || body.profileImage === "") && current.profileImage) {
      deleteUploadFileByPublicUrl(current.profileImage);
    }
    updates.profileImage = body.profileImage || null;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  const coach = await updateWellnessCoach(current.id, updates);
  return res.status(200).json({
    status: true,
    message: "Wellness coach updated successfully",
    wellnessCoach: coach,
  });
});

exports.deleteWellnessCoachController = asyncHandler(async (req, res) => {
  const current = await getWellnessCoachById(req.params.id);
  if (!current) throw new AppError("Wellness coach not found", 404);

  const assistantCount = await countAssistantsByWellnessCoachId(current.id);
  if (assistantCount > 0) {
    throw new AppError(
      "Cannot delete wellness coach while assistants are assigned. Remove assistants first.",
      409
    );
  }

  if (current.profileImage) deleteUploadFileByPublicUrl(current.profileImage);

  try {
    await deleteWellnessCoach(current.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Wellness coach not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Wellness coach deleted successfully",
  });
});

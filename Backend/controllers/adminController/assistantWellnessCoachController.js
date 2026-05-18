const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { publicUploadPathFromFile } = require("../../utils/publicUploadPath");
const { deleteUploadFileByPublicUrl } = require("../../utils/deleteUploadFile");
const { getWellnessCoachById } = require("../../models/wellnessCoachModel");
const {
  createAssistantWellnessCoach,
  getAssistantWellnessCoachById,
  getAssistantByEmail,
  getAssistantByPhone,
  updateAssistantWellnessCoach,
  deleteAssistantWellnessCoach,
  listAssistantsByWellnessCoachId,
  listAssistantWellnessCoaches,
  normalizeStatus,
  ALLOWED_STATUS,
} = require("../../models/assistantWellnessCoachModel");
const { normalizeEmail, normalizePhone, normalizeCountryCode } = require("../../models/userModel");

async function assertCoachExists(wellnessCoachId) {
  const coach = await getWellnessCoachById(wellnessCoachId);
  if (!coach) throw new AppError("Wellness coach not found", 404);
  return coach;
}

async function assertUniqueAssistantEmail(email, excludeId) {
  const existing = await getAssistantByEmail(email);
  if (existing && existing.id !== excludeId) {
    throw new AppError("An assistant already exists with this email", 409);
  }
}

async function assertUniqueAssistantPhone(phoneCountryCode, phone, excludeId) {
  const existing = await getAssistantByPhone(phoneCountryCode, phone);
  if (existing && existing.id !== excludeId) {
    throw new AppError("An assistant already exists with this phone number", 409);
  }
}

function parseAssistantBody(body, wellnessCoachId) {
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
    wellnessCoachId,
    name,
    email,
    phone,
    phoneCountryCode,
    designation:
      body.designation !== undefined ? String(body.designation || "").trim() || null : null,
    profileImage:
      body.profileImage !== undefined ? String(body.profileImage || "").trim() || null : null,
    status,
  };
}

function assertAssistantBelongsToCoach(assistant, wellnessCoachId) {
  if (assistant.wellnessCoachId !== wellnessCoachId) {
    throw new AppError("Assistant does not belong to this wellness coach", 404);
  }
}

exports.listAssistantsController = asyncHandler(async (req, res) => {
  const { coachId } = req.params;
  await assertCoachExists(coachId);

  const { page = 1, limit = 20, status, search } = req.query;
  const data = await listAssistantsByWellnessCoachId(coachId, { page, limit, status, search });

  return res.status(200).json({
    status: true,
    assistants: data.assistants,
    pagination: data.pagination,
  });
});

exports.listAllAssistantsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search, wellnessCoachId } = req.query;
  const data = await listAssistantWellnessCoaches({
    page,
    limit,
    status,
    search,
    wellnessCoachId,
  });

  return res.status(200).json({
    status: true,
    assistants: data.assistants,
    pagination: data.pagination,
  });
});

exports.getAssistantByIdController = asyncHandler(async (req, res) => {
  const { coachId, id } = req.params;
  await assertCoachExists(coachId);

  const assistant = await getAssistantWellnessCoachById(id);
  if (!assistant) throw new AppError("Assistant wellness coach not found", 404);
  assertAssistantBelongsToCoach(assistant, coachId);

  return res.status(200).json({ status: true, assistant });
});

exports.createAssistantController = asyncHandler(async (req, res) => {
  const { coachId } = req.params;
  await assertCoachExists(coachId);

  const fields = parseAssistantBody(req.body, coachId);
  await assertUniqueAssistantEmail(fields.email);
  await assertUniqueAssistantPhone(fields.phoneCountryCode, fields.phone);

  const uploaded = publicUploadPathFromFile(req, "assistant-wellness-coach");
  if (uploaded) fields.profileImage = uploaded;

  const assistant = await createAssistantWellnessCoach(fields);
  return res.status(201).json({
    status: true,
    message: "Assistant wellness coach created successfully",
    assistant,
  });
});

exports.updateAssistantController = asyncHandler(async (req, res) => {
  const { coachId, id } = req.params;
  await assertCoachExists(coachId);

  const current = await getAssistantWellnessCoachById(id);
  if (!current) throw new AppError("Assistant wellness coach not found", 404);
  assertAssistantBelongsToCoach(current, coachId);

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
    await assertUniqueAssistantEmail(email, current.id);
    updates.email = email;
  }
  if (body.phone !== undefined) {
    const phone = normalizePhone(body.phone);
    if (!phone) throw new AppError("phone cannot be empty", 400);
    const phoneCountryCode =
      body.phoneCountryCode !== undefined
        ? normalizeCountryCode(body.phoneCountryCode)
        : current.phoneCountryCode;
    await assertUniqueAssistantPhone(phoneCountryCode, phone, current.id);
    updates.phone = phone;
    if (body.phoneCountryCode !== undefined) updates.phoneCountryCode = phoneCountryCode;
  } else if (body.phoneCountryCode !== undefined) {
    updates.phoneCountryCode = normalizeCountryCode(body.phoneCountryCode);
    await assertUniqueAssistantPhone(updates.phoneCountryCode, current.phone, current.id);
  }
  if (body.status !== undefined) {
    const status = normalizeStatus(body.status);
    if (!ALLOWED_STATUS.has(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (body.designation !== undefined) {
    updates.designation = String(body.designation || "").trim() || null;
  }

  const uploaded = publicUploadPathFromFile(req, "assistant-wellness-coach");
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

  const assistant = await updateAssistantWellnessCoach(current.id, updates);
  return res.status(200).json({
    status: true,
    message: "Assistant wellness coach updated successfully",
    assistant,
  });
});

exports.deleteAssistantController = asyncHandler(async (req, res) => {
  const { coachId, id } = req.params;
  await assertCoachExists(coachId);

  const current = await getAssistantWellnessCoachById(id);
  if (!current) throw new AppError("Assistant wellness coach not found", 404);
  assertAssistantBelongsToCoach(current, coachId);

  if (current.profileImage) deleteUploadFileByPublicUrl(current.profileImage);

  try {
    await deleteAssistantWellnessCoach(current.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Assistant wellness coach not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Assistant wellness coach deleted successfully",
  });
});

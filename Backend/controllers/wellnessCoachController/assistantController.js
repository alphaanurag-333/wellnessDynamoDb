const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { hashPassword } = require("../../utils/password");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  createAssistantWellnessCoach,
  getAssistantWellnessCoachById,
  getAssistantByEmail,
  getAssistantByPhone,
  updateAssistantWellnessCoach,
  deleteAssistantWellnessCoach,
  listAssistantsByWellnessCoachId,
  countAssistantsByWellnessCoachId,
  toPublicAssistant,
} = require("../../models/assistantWellnessCoachModel");
const { assertPasswordPolicy } = require("../../utils/passwordPolicy");
const { normalizeEmail, normalizePhone, normalizeCountryCode } = require("../../models/userModel");
const { normalizeStatus, ALLOWED_STATUS } = require("../../models/assistantWellnessCoachModel");

const S3_FOLDER = "assistant-wellness-coach";

function parseAssistantBody(body) {
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

  const profileImage = parseMediaKeyFromBody(body.profileImage, "profileImage");

  return {
    name,
    email,
    phone,
    phoneCountryCode,
    designation: body.designation != null ? String(body.designation).trim() || null : null,
    profileImage: profileImage !== undefined ? profileImage : null,
    status,
    password: body.password !== undefined ? String(body.password || "").trim() : undefined,
  };
}

function parseAssistantPassword(body, { required = false } = {}) {
  const password = String(body.password ?? "").trim();
  if (!password) {
    if (required) throw new AppError("password is required", 400);
    return undefined;
  }
  assertPasswordPolicy(password, { required: true, label: "Password" });
  return password;
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

exports.listMyAssistantsController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  const { page = 1, limit = 20, status, search } = req.query;
  const data = await listAssistantsByWellnessCoachId(coachId, { page, limit, status, search });
  const assistants = data.assistants.map((a) => toPublicAssistant(a));
  return res.status(200).json({
    status: true,
    assistants,
    pagination: data.pagination,
  });
});

exports.getMyAssistantCountController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  const count = await countAssistantsByWellnessCoachId(coachId);
  return res.status(200).json({ status: true, count });
});

exports.getMyAssistantController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  const assistant = await getAssistantWellnessCoachById(req.params.id);
  if (!assistant) throw new AppError("Assistant not found", 404);
  if (assistant.wellnessCoachId !== coachId) throw new AppError("Assistant not found", 404);
  return res.status(200).json({ status: true, assistant: toPublicAssistant(assistant) });
});

exports.createMyAssistantController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  const fields = parseAssistantBody(req.body);
  const plainPassword = parseAssistantPassword(req.body, { required: true });
  fields.password = await hashPassword(plainPassword);
  await assertUniqueAssistantEmail(fields.email);
  await assertUniqueAssistantPhone(fields.phoneCountryCode, fields.phone);

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (uploadedKey) fields.profileImage = uploadedKey;

  const assistant = await createAssistantWellnessCoach({ ...fields, wellnessCoachId: coachId });
  return res.status(201).json({
    status: true,
    message: "Assistant created successfully",
    assistant: toPublicAssistant(assistant),
  });
});

exports.updateMyAssistantController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  const current = await getAssistantWellnessCoachById(req.params.id);
  if (!current) throw new AppError("Assistant not found", 404);
  if (current.wellnessCoachId !== coachId) throw new AppError("Assistant not found", 404);

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
  }
  if (body.designation !== undefined) {
    updates.designation = String(body.designation || "").trim() || null;
  }
  if (body.status !== undefined) {
    const st = normalizeStatus(body.status);
    if (!ALLOWED_STATUS.has(st)) throw new AppError("status must be active or inactive", 400);
    updates.status = st;
  }
  if (body.password !== undefined) {
    const pw = parseAssistantPassword(body);
    if (pw) updates.password = await hashPassword(pw);
  }
  if (body.profileImage !== undefined) {
    const profileImage = parseMediaKeyFromBody(body.profileImage, "profileImage");
    if (profileImage === null && current.profileImage) {
      await deleteStoredMedia(current.profileImage);
    }
    updates.profileImage = profileImage;
  }

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (uploadedKey) {
    if (current.profileImage && current.profileImage !== uploadedKey) {
      await deleteStoredMedia(current.profileImage);
    }
    updates.profileImage = uploadedKey;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  const updated = await updateAssistantWellnessCoach(current.id, updates);
  return res.status(200).json({
    status: true,
    message: "Assistant updated successfully",
    assistant: toPublicAssistant(updated),
  });
});

exports.deleteMyAssistantController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  const current = await getAssistantWellnessCoachById(req.params.id);
  if (!current) throw new AppError("Assistant not found", 404);
  if (current.wellnessCoachId !== coachId) throw new AppError("Assistant not found", 404);

  if (current.profileImage) await deleteStoredMedia(current.profileImage);

  try {
    await deleteAssistantWellnessCoach(current.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Assistant not found", 404);
    }
    throw err;
  }

  return res.status(200).json({ status: true, message: "Assistant deleted successfully" });
});

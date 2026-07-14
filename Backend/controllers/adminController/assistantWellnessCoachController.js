const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { hashPassword } = require("../../utils/password");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  normalizeStoredMedia,
} = require("../../utils/s3");
const { getWellnessCoachById } = require("../../models/wellnessCoachModel");
const {
  createAssistantWellnessCoach,
  getAssistantWellnessCoachById,
  getAssistantWellnessCoachRecordById,
  getAssistantByEmail,
  getAssistantByPhone,
  updateAssistantWellnessCoach,
  deleteAssistantWellnessCoach,
  listAssistantsByWellnessCoachId,
  listAssistantWellnessCoaches,
  populateWellnessCoach,
  populateWellnessCoaches,
  normalizeStatus,
  ALLOWED_STATUS,
  normalizeVisibleFlag,
} = require("../../models/assistantWellnessCoachModel");
const { assertPasswordPolicy } = require("../../utils/passwordPolicy");
const { normalizeEmail, normalizePhone, normalizeCountryCode } = require("../../models/userModel");

const S3_FOLDER = "assistant-wellness-coach";

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

function parseProfileImageFromBody(value) {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === "") return null;

  const raw = String(value).trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    throw new AppError("profileImage must be an S3 object key, not a URL", 400);
  }

  const key = normalizeStoredMedia(raw);
  if (!key) throw new AppError("profileImage is invalid", 400);
  return key;
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

  const profileImage = parseProfileImageFromBody(body.profileImage);

  return {
    wellnessCoachId,
    name,
    email,
    phone,
    phoneCountryCode,
    designation:
      body.designation !== undefined ? String(body.designation || "").trim() || null : null,
    profileImage: profileImage !== undefined ? profileImage : null,
    status,
    webVisible: body.webVisible !== undefined ? normalizeVisibleFlag(body.webVisible, true) : true,
    appVisible: body.appVisible !== undefined ? normalizeVisibleFlag(body.appVisible, true) : true,
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

function assertAssistantBelongsToCoach(assistant, wellnessCoachId) {
  if (assistant.wellnessCoachId !== wellnessCoachId) {
    throw new AppError("Assistant does not belong to this wellness coach", 404);
  }
}

async function applyProfileImageUpdates(body, current, updates, req) {
  if (body.profileImage !== undefined) {
    const profileImage = parseProfileImageFromBody(body.profileImage);
    if (profileImage === null && current.profileImage) {
      await deleteStoredMedia(current.profileImage);
    }
    updates.profileImage = profileImage;
  }

  if (req) {
    const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
    if (uploadedKey) {
      if (current.profileImage && current.profileImage !== uploadedKey) {
        await deleteStoredMedia(current.profileImage);
      }
      updates.profileImage = uploadedKey;
    }
  }
}

exports.listAssistantsController = asyncHandler(async (req, res) => {
  const { coachId } = req.params;
  const coach = await assertCoachExists(coachId);

  const { page = 1, limit = 20, status, search } = req.query;
  const data = await listAssistantsByWellnessCoachId(coachId, { page, limit, status, search });
  const assistants = await Promise.all(
    data.assistants.map((row) => populateWellnessCoach(row, coach))
  );

  return res.status(200).json({
    status: true,
    assistants,
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

  const assistants = await populateWellnessCoaches(data.assistants);

  return res.status(200).json({
    status: true,
    assistants,
    pagination: data.pagination,
  });
});

exports.getAssistantByIdController = asyncHandler(async (req, res) => {
  const { coachId, id } = req.params;
  const coach = await assertCoachExists(coachId);

  const assistant = await getAssistantWellnessCoachById(id);
  if (!assistant) throw new AppError("Assistant wellness coach not found", 404);
  assertAssistantBelongsToCoach(assistant, coachId);

  return res.status(200).json({
    status: true,
    assistant: await populateWellnessCoach(assistant, coach),
  });
});

exports.createAssistantController = asyncHandler(async (req, res) => {
  const { coachId } = req.params;
  const coach = await assertCoachExists(coachId);

  const fields = parseAssistantBody(req.body, coachId);
  const plainPassword = parseAssistantPassword(req.body, { required: true });
  fields.password = await hashPassword(plainPassword);
  await assertUniqueAssistantEmail(fields.email);
  await assertUniqueAssistantPhone(fields.phoneCountryCode, fields.phone);

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (uploadedKey) fields.profileImage = uploadedKey;

  const assistant = await populateWellnessCoach(
    await createAssistantWellnessCoach(fields),
    coach
  );
  return res.status(201).json({
    status: true,
    message: "Assistant wellness coach created successfully",
    assistant,
  });
});

exports.updateAssistantController = asyncHandler(async (req, res) => {
  const { coachId, id } = req.params;
  const coach = await assertCoachExists(coachId);

  const current = await getAssistantWellnessCoachRecordById(id);
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
  if (body.webVisible !== undefined) {
    updates.webVisible = normalizeVisibleFlag(body.webVisible, true);
  }
  if (body.appVisible !== undefined) {
    updates.appVisible = normalizeVisibleFlag(body.appVisible, true);
  }
  if (body.designation !== undefined) {
    updates.designation = String(body.designation || "").trim() || null;
  }

  if (body.password !== undefined) {
    const plainPassword = parseAssistantPassword(body);
    if (plainPassword) updates.password = await hashPassword(plainPassword);
  }

  await applyProfileImageUpdates(body, current, updates, req);

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  const assistant = await populateWellnessCoach(
    await updateAssistantWellnessCoach(current.id, updates),
    coach
  );
  return res.status(200).json({
    status: true,
    message: "Assistant wellness coach updated successfully",
    assistant,
  });
});

exports.deleteAssistantController = asyncHandler(async (req, res) => {
  const { coachId, id } = req.params;
  await assertCoachExists(coachId);

  const current = await getAssistantWellnessCoachRecordById(id);
  if (!current) throw new AppError("Assistant wellness coach not found", 404);
  assertAssistantBelongsToCoach(current, coachId);

  if (current.profileImage) await deleteStoredMedia(current.profileImage);

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

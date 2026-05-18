const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { hashPassword } = require("../../utils/password");
const { publicUploadPathFromFile } = require("../../utils/publicUploadPath");
const { deleteUploadFileByPublicUrl } = require("../../utils/deleteUploadFile");
const { getHealthConcernById } = require("../../models/healthConcernModel");
const {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByPhone,
  updateUser,
  deleteUser,
  listUsers,
  toPublicUser,
  normalizeEmail,
  normalizePhone,
  normalizeCountryCode,
  normalizeStatus,
  normalizeGender,
  normalizeDob,
  USER_ALLOWED_STATUS,
  USER_ALLOWED_GENDERS,
} = require("../../models/userModel");

function parseBool(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return undefined;
}

function parseUserFields(body, { requirePassword = false } = {}) {
  const name = String(body.name ?? "").trim();
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const phoneCountryCode = normalizeCountryCode(body.phoneCountryCode);
  const password = String(body.password ?? "").trim();
  const whatsappSameAsMobile = parseBool(body.whatsappSameAsMobile);
  const whatsappCountryCode =
    body.whatsappCountryCode !== undefined
      ? normalizeCountryCode(body.whatsappCountryCode)
      : undefined;
  const whatsappPhone =
    body.whatsappPhone !== undefined ? normalizePhone(body.whatsappPhone) || null : undefined;
  const dob = body.dob !== undefined ? normalizeDob(body.dob) : undefined;
  const gender = body.gender !== undefined ? normalizeGender(body.gender) : undefined;
  const country = body.country !== undefined ? String(body.country || "").trim() || null : undefined;
  const state = body.state !== undefined ? String(body.state || "").trim() || null : undefined;
  const city = body.city !== undefined ? String(body.city || "").trim() || null : undefined;
  const primaryHealthConcern =
    body.primaryHealthConcern !== undefined
      ? String(body.primaryHealthConcern || "").trim() || null
      : undefined;
  const termsAccepted = parseBool(body.termsAccepted);
  const termsAcceptedAt =
    body.termsAcceptedAt !== undefined ? normalizeDob(body.termsAcceptedAt) : undefined;
  const fcm_id = body.fcm_id !== undefined ? String(body.fcm_id || "").trim() || null : undefined;
  const status = body.status !== undefined ? normalizeStatus(body.status) : undefined;
  const profileImage =
    body.profileImage !== undefined ? String(body.profileImage || "").trim() || null : undefined;

  if (!name) throw new AppError("name is required", 400);
  if (!email) throw new AppError("email is required", 400);
  if (!phone) throw new AppError("phone is required", 400);
  if (requirePassword && !password) throw new AppError("password is required", 400);

  if (status && !USER_ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active, inactive, or blocked", 400);
  }
  if (gender && !USER_ALLOWED_GENDERS.includes(gender)) {
    throw new AppError("gender is invalid", 400);
  }

  const fields = {
    name,
    email,
    phone,
    phoneCountryCode,
    whatsappSameAsMobile: whatsappSameAsMobile ?? false,
    dob: dob ?? null,
    gender: gender ?? "boy",
    country: country ?? null,
    state: state ?? null,
    city: city ?? null,
    primaryHealthConcern: primaryHealthConcern ?? null,
    termsAccepted: termsAccepted ?? false,
    termsAcceptedAt: termsAcceptedAt ?? null,
    fcm_id: fcm_id ?? null,
    status: status ?? "active",
    profileImage: profileImage ?? null,
  };

  if (whatsappCountryCode !== undefined) fields.whatsappCountryCode = whatsappCountryCode;
  if (whatsappPhone !== undefined) fields.whatsappPhone = whatsappPhone;

  return { fields, password };
}

async function enrichUser(user) {
  if (!user) return null;
  const pub = toPublicUser(user);
  const concernId = pub.primaryHealthConcern;
  if (concernId) {
    const concern = await getHealthConcernById(concernId);
    if (concern) {
      pub.primaryHealthConcern = {
        _id: concern._id || concern.id,
        id: concern.id,
        title: concern.title || "",
        description: concern.description || "",
        icon: concern.icon || "",
        status: concern.status || "",
      };
    }
  }
  return pub;
}

async function assertUniqueEmail(email, excludeUserId) {
  const existing = await getUserByEmail(email);
  if (existing && existing.id !== excludeUserId) {
    throw new AppError("A user already exists with this email", 409);
  }
}

async function assertUniquePhone(phoneCountryCode, phone, excludeUserId) {
  const existing = await getUserByPhone(phoneCountryCode, phone);
  if (existing && existing.id !== excludeUserId) {
    throw new AppError("A user already exists with this phone number", 409);
  }
}

exports.listUsersController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const data = await listUsers({ page, limit, status, search });
  const users = await Promise.all(data.users.map((u) => enrichUser(u)));
  return res.status(200).json({ status: true, users, pagination: data.pagination });
});

exports.getUserByIdController = asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) throw new AppError("User not found", 404);
  return res.status(200).json({ status: true, user: await enrichUser(user) });
});

exports.createUserController = asyncHandler(async (req, res) => {
  const { fields, password } = parseUserFields(req.body, { requirePassword: false });

  await assertUniqueEmail(fields.email);
  await assertUniquePhone(fields.phoneCountryCode, fields.phone);

  const uploadedProfile = publicUploadPathFromFile(req, "user");
  if (uploadedProfile) fields.profileImage = uploadedProfile;

  if (password) {
    fields.passwordHash = await hashPassword(password);
  }

  if (fields.termsAccepted && !fields.termsAcceptedAt) {
    fields.termsAcceptedAt = new Date().toISOString();
  }

  if (fields.primaryHealthConcern) {
    const concern = await getHealthConcernById(fields.primaryHealthConcern);
    if (!concern) throw new AppError("primaryHealthConcern not found", 400);
  }

  const user = await createUser(fields);
  return res.status(201).json({
    status: true,
    message: "User created successfully",
    user: await enrichUser(user),
  });
});

exports.updateUserController = asyncHandler(async (req, res) => {
  const current = await getUserById(req.params.id);
  if (!current) throw new AppError("User not found", 404);

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
    await assertUniqueEmail(email, current.id);
    updates.email = email;
  }
  if (body.phone !== undefined) {
    const phone = normalizePhone(body.phone);
    if (!phone) throw new AppError("phone cannot be empty", 400);
    const cc =
      body.phoneCountryCode !== undefined
        ? normalizeCountryCode(body.phoneCountryCode)
        : current.phoneCountryCode;
    await assertUniquePhone(cc, phone, current.id);
    updates.phone = phone;
    if (body.phoneCountryCode !== undefined) updates.phoneCountryCode = cc;
  } else if (body.phoneCountryCode !== undefined) {
    updates.phoneCountryCode = normalizeCountryCode(body.phoneCountryCode);
    await assertUniquePhone(updates.phoneCountryCode, current.phone, current.id);
  }

  const whatsappSame = parseBool(body.whatsappSameAsMobile);
  if (whatsappSame !== undefined) updates.whatsappSameAsMobile = whatsappSame;
  if (body.whatsappCountryCode !== undefined) {
    updates.whatsappCountryCode = normalizeCountryCode(body.whatsappCountryCode);
  }
  if (body.whatsappPhone !== undefined) {
    updates.whatsappPhone = normalizePhone(body.whatsappPhone) || null;
  }
  if (body.dob !== undefined) updates.dob = normalizeDob(body.dob);
  if (body.gender !== undefined) {
    const gender = normalizeGender(body.gender);
    if (!USER_ALLOWED_GENDERS.includes(gender)) throw new AppError("gender is invalid", 400);
    updates.gender = gender;
  }
  if (body.country !== undefined) updates.country = String(body.country || "").trim() || null;
  if (body.state !== undefined) updates.state = String(body.state || "").trim() || null;
  if (body.city !== undefined) updates.city = String(body.city || "").trim() || null;
  if (body.primaryHealthConcern !== undefined) {
    const phc = String(body.primaryHealthConcern || "").trim() || null;
    if (phc) {
      const concern = await getHealthConcernById(phc);
      if (!concern) throw new AppError("primaryHealthConcern not found", 400);
    }
    updates.primaryHealthConcern = phc;
  }
  if (body.termsAccepted !== undefined) {
    updates.termsAccepted = parseBool(body.termsAccepted);
    if (updates.termsAccepted && body.termsAcceptedAt === undefined && !current.termsAcceptedAt) {
      updates.termsAcceptedAt = new Date().toISOString();
    }
  }
  if (body.termsAcceptedAt !== undefined) {
    updates.termsAcceptedAt = normalizeDob(body.termsAcceptedAt);
  }
  if (body.fcm_id !== undefined) updates.fcm_id = String(body.fcm_id || "").trim() || null;
  if (body.status !== undefined) {
    const status = normalizeStatus(body.status);
    if (!USER_ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active, inactive, or blocked", 400);
    }
    updates.status = status;
  }
  if (body.profileImage !== undefined) {
    updates.profileImage = String(body.profileImage || "").trim() || null;
  }

  const uploadedProfile = publicUploadPathFromFile(req, "user");
  if (uploadedProfile) {
    if (current.profileImage) deleteUploadFileByPublicUrl(current.profileImage);
    updates.profileImage = uploadedProfile;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let user;
  try {
    user = await updateUser(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException" || err?.name === "NotFoundError") {
      throw new AppError("User not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "User updated successfully",
    user: await enrichUser(user),
  });
});

exports.deleteUserController = asyncHandler(async (req, res) => {
  const current = await getUserById(req.params.id);
  if (!current) throw new AppError("User not found", 404);
  if (current.profileImage) deleteUploadFileByPublicUrl(current.profileImage);

  try {
    await deleteUser(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("User not found", 404);
    }
    throw err;
  }

  return res.status(200).json({ status: true, message: "User deleted successfully" });
});


exports.parseUserFields = parseUserFields;
exports.assertUniqueEmail = assertUniqueEmail;
exports.assertUniquePhone = assertUniquePhone;
exports.enrichUser = enrichUser;

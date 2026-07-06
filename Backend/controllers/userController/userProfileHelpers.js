const AppError = require("../../utils/AppError");
const { assertValidIndianMobile } = require("../../utils/phoneValidation");
const { generateOtp, getOtpExpiryDate, isOtpExpired, deliverOtp } = require("../../utils/otp");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const { getHealthConcernById } = require("../../models/healthConcernModel");
const { getWellnessCoachById } = require("../../models/wellnessCoachModel");
const { getAssistantWellnessCoachById } = require("../../models/assistantWellnessCoachModel");
const {
  getUserById,
  getUserByEmail,
  getUserByPhone,
  updateUser,
  deleteUser,
  toPublicUser,
  normalizeEmail,
  normalizePhone,
  normalizeCountryCode,
  buildPhoneKey,
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

/** Accepts fcm_id, fcmId, fcm_token, fcmToken. Undefined = omit; empty string = clear. */
function parseFcmIdFromBody(body) {
  if (!body || typeof body !== "object") return undefined;
  const raw = body.fcm_id ?? body.fcmId ?? body.fcm_token ?? body.fcmToken;
  if (raw === undefined || raw === null) return undefined;
  return String(raw).trim() || null;
}

async function persistFcmIdIfPresent(userId, body) {
  const fcm_id = parseFcmIdFromBody(body);
  if (fcm_id === undefined) return null;
  return updateUser(userId, { fcm_id });
}

/** Body field: S3 key or our public URL; null clears; undefined = omit. */
function parseProfileImageFromBody(value) {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === "") return null;
  return parseMediaKeyFromBody(value, "profileImage");
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
  const fcm_id = parseFcmIdFromBody(body);
  const status = body.status !== undefined ? normalizeStatus(body.status) : undefined;
  const profileImage = parseProfileImageFromBody(body.profileImage);

  if (!name) throw new AppError("name is required", 400);
  if (!email) throw new AppError("email is required", 400);
  if (!phone) throw new AppError("phone is required", 400);
  assertValidIndianMobile(phone, { field: "phone" });
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
    profileImage: profileImage !== undefined ? profileImage : null,
  };

  if (whatsappCountryCode !== undefined) fields.whatsappCountryCode = whatsappCountryCode;
  if (whatsappPhone !== undefined) {
    fields.whatsappPhone = whatsappPhone;
    if (whatsappPhone) assertValidIndianMobile(whatsappPhone, { field: "whatsappPhone" });
  }

  return { fields, password };
}

async function enrichUser(user) {
  if (!user) return null;
  const pub = toPublicUser(user);
  const concernId = pub.primaryHealthConcern;
  if (concernId && typeof concernId === "string") {
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

  if (pub.assignedCoachId && pub.assignedCoachType) {
    if (pub.assignedCoachType === "wellness_coach") {
      const coach = await getWellnessCoachById(pub.assignedCoachId);
      pub.assignedCoach = coach
        ? { id: coach.id, _id: coach._id ?? coach.id, name: coach.name, profileImage: coach.profileImage || null, type: "wellness_coach" }
        : null;
    } else if (pub.assignedCoachType === "assistant_wellness_coach") {
      const assistant = await getAssistantWellnessCoachById(pub.assignedCoachId);
      pub.assignedCoach = assistant
        ? {
            id: assistant.id,
            _id: assistant._id ?? assistant.id,
            name: assistant.name,
            profileImage: assistant.profileImage || null,
            type: "assistant_wellness_coach",
          }
        : null;
    }
  }

  if (pub.parentCoachId) {
    const parentCoach = await getWellnessCoachById(pub.parentCoachId);
    pub.parentCoach = parentCoach
      ? { id: parentCoach.id, _id: parentCoach._id ?? parentCoach.id, name: parentCoach.name, profileImage: parentCoach.profileImage || null }
      : null;
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

async function buildUserUpdatesFromBody(body, current, { allowStatus = true, req } = {}) {
  const updates = {};

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
  if (body.phone !== undefined || body.phoneCountryCode !== undefined) {
    const nextPhone =
      body.phone !== undefined ? normalizePhone(body.phone) : normalizePhone(current.phone);
    const nextCc =
      body.phoneCountryCode !== undefined
        ? normalizeCountryCode(body.phoneCountryCode)
        : normalizeCountryCode(current.phoneCountryCode);
    const currentPhone = normalizePhone(current.phone);
    const currentCc = normalizeCountryCode(current.phoneCountryCode);

    if (nextPhone !== currentPhone || nextCc !== currentCc) {
      throw new AppError(
        "Phone number changes require OTP verification. Use /user/auth/profile/phone/otp/send and /verify.",
        400
      );
    }
  }

  const whatsappSame = parseBool(body.whatsappSameAsMobile);
  if (whatsappSame !== undefined) updates.whatsappSameAsMobile = whatsappSame;
  if (body.whatsappCountryCode !== undefined) {
    updates.whatsappCountryCode = normalizeCountryCode(body.whatsappCountryCode);
  }
  if (body.whatsappPhone !== undefined) {
    const waPhone = normalizePhone(body.whatsappPhone) || null;
    if (waPhone) assertValidIndianMobile(waPhone, { field: "whatsappPhone" });
    updates.whatsappPhone = waPhone;
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
  const fcm_id = parseFcmIdFromBody(body);
  if (fcm_id !== undefined) updates.fcm_id = fcm_id;

  if (allowStatus && body.status !== undefined) {
    const status = normalizeStatus(body.status);
    if (!USER_ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active, inactive, or blocked", 400);
    }
    updates.status = status;
  }

  if (body.profileImage !== undefined) {
    const profileImage = parseProfileImageFromBody(body.profileImage);
    if (profileImage === null && current.profileImage) {
      await deleteStoredMedia(current.profileImage);
    }
    updates.profileImage = profileImage;
  }

  if (req) {
    const uploadedKey = await uploadFileFromRequest(req, "user");
    if (uploadedKey) {
      if (current.profileImage && current.profileImage !== uploadedKey) {
        await deleteStoredMedia(current.profileImage);
      }
      updates.profileImage = uploadedKey;
    }
  }

  return updates;
}

async function resolveUserByPhoneInput(phone, phoneCountryCode) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new AppError("phone is required", 400);
  const cc = normalizeCountryCode(phoneCountryCode);
  const user = await getUserByPhone(cc, normalizedPhone);
  if (!user) throw new AppError("User not found", 404);
  return user;
}

async function deleteUserAccountByPhoneOtp({ phone, phoneCountryCode, otp }) {
  const user = await resolveUserByPhoneInput(phone, phoneCountryCode);
  const code = String(otp ?? "").trim();
  if (!code) throw new AppError("otp is required", 400);

  if (!user.otp || !user.otpExpire) {
    throw new AppError("No OTP requested. Send delete-account OTP first.", 400);
  }
  if (isOtpExpired(user.otpExpire)) {
    throw new AppError("OTP has expired. Request a new code.", 400);
  }
  if (String(user.otp) !== code) {
    throw new AppError("Invalid OTP", 401);
  }

  await updateUser(user.id, { otp: null, otpExpire: null });

  if (user.profileImage) await deleteStoredMedia(user.profileImage);

  try {
    await deleteUser(user.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("User not found", 404);
    }
    throw err;
  }
}

async function sendProfilePhoneChangeOtp(user, { phone, phoneCountryCode }) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new AppError("phone is required", 400);
  assertValidIndianMobile(normalizedPhone, { field: "phone" });
  const cc = normalizeCountryCode(phoneCountryCode || user.phoneCountryCode);
  await assertUniquePhone(cc, normalizedPhone, user.id);

  const otp = generateOtp();
  const otpExpire = getOtpExpiryDate();

  await updateUser(user.id, {
    otp,
    otpExpire,
    pendingPhone: normalizedPhone,
    pendingPhoneCountryCode: cc,
  });

  await deliverOtp({
    phone: normalizedPhone,
    phoneCountryCode: cc,
    otp,
  });

  return { otp, otpExpire };
}

async function verifyProfilePhoneChangeOtp(user, { phone, phoneCountryCode, otp }) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new AppError("phone is required", 400);
  const cc = normalizeCountryCode(phoneCountryCode || user.phoneCountryCode);
  const code = String(otp ?? "").trim();
  if (!code) throw new AppError("otp is required", 400);

  if (!user.otp || !user.otpExpire) {
    throw new AppError("No OTP requested. Send phone-change OTP first.", 400);
  }
  if (isOtpExpired(user.otpExpire)) {
    throw new AppError("OTP has expired. Request a new code.", 400);
  }
  if (String(user.otp) !== code) {
    throw new AppError("Invalid OTP", 401);
  }
  if (
    normalizePhone(user.pendingPhone) !== normalizedPhone ||
    normalizeCountryCode(user.pendingPhoneCountryCode) !== cc
  ) {
    throw new AppError("Phone number does not match the pending verification request", 400);
  }

  await assertUniquePhone(cc, normalizedPhone, user.id);

  const updated = await updateUser(user.id, {
    phone: normalizedPhone,
    phoneCountryCode: cc,
    phoneKey: buildPhoneKey(cc, normalizedPhone),
    otp: null,
    otpExpire: null,
    pendingPhone: null,
    pendingPhoneCountryCode: null,
  });

  return updated;
}

module.exports = {
  parseUserFields,
  parseFcmIdFromBody,
  persistFcmIdIfPresent,
  enrichUser,
  assertUniqueEmail,
  assertUniquePhone,
  buildUserUpdatesFromBody,
  parseProfileImageFromBody,
  resolveUserByPhoneInput,
  deleteUserAccountByPhoneOtp,
  sendProfilePhoneChangeOtp,
  verifyProfilePhoneChangeOtp,
};

const AppError = require("../../utils/AppError");
const { assertValidIndianMobile, assertValidMobile } = require("../../utils/phoneValidation");
const { generateOtp, getOtpExpiryDate, isOtpExpired, deliverOtp } = require("../../utils/otp");
const {
  uploadFileFromRequest,
  uploadMulterField,
  deleteStoredMedia,
  parseMediaKeyFromBody,
  resolvePublicUrl,
} = require("../../utils/s3");
const { getHealthConcernById } = require("../../models/healthConcernModel");
const { getClientIp } = require("../../utils/clientIp");
const {
  getUserProgramById,
  toPublicUserProgram,
} = require("../../models/userProgramModel");
const {
  parseHealthConcernOtherFromBody,
  MAX_HEALTH_CONCERN_OTHER_LENGTH,
} = require("../../services/consultancyHealthConcern");
const { getWellnessCoachById } = require("../../models/wellnessCoachModel");
const { getAssistantWellnessCoachById } = require("../../models/assistantWellnessCoachModel");
const {
  getWellnessCoachByIdResolved,
  getAssistantWellnessCoachByIdResolved,
} = require("../../services/accountResolver");
const { toPublicIntroVideo } = require("../../utils/coachContent");
const {
  listSubscriptionsByUserId,
} = require("../../models/energyExchangeSubscriptionModel");
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
  isPresentablePicsEnabled,
  USER_ALLOWED_STATUS,
  USER_ALLOWED_GENDERS,
} = require("../../models/userModel");
const { ensureEntityReferralCode } = require("../../models/referralCodeModel");

function parseBool(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return undefined;
}

function resolveCoachProfileImage(profileImage) {
  if (!profileImage) return null;
  return resolvePublicUrl(profileImage) || profileImage;
}

/** Live coach intro only — omitted when draft, empty, or not uploaded. */
function buildPublicWelcomeVideo(account) {
  if (!account) return null;
  const intro = toPublicIntroVideo(account.coach_content?.intro);
  if (!intro?.live) return null;
  return {
    title: intro.title,
    description: intro.description,
    sourceType: intro.sourceType,
    videoUrl: intro.videoUrl,
    linkUrl: intro.linkUrl,
    coverUrl: intro.coverUrl,
    live: intro.live,
    duration: intro.duration,
  };
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

function parsePresentablePicFromBody(value) {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === "") return null;
  return parseMediaKeyFromBody(value, "presentablePic");
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
  const pincode =
    body.pincode !== undefined ? String(body.pincode || "").trim() || null : undefined;
  const primaryHealthConcern =
    body.primaryHealthConcern !== undefined
      ? String(body.primaryHealthConcern || "").trim() || null
      : undefined;
  const primaryHealthConcernOtherRaw = parseHealthConcernOtherFromBody({
    ...body,
    healthConcernOther:
      body.primaryHealthConcernOther ??
      body.primary_health_concern_other ??
      body.healthConcernOther ??
      body.health_concern_other ??
      body.customHealthConcern ??
      body.custom_health_concern,
  });
  const primaryHealthConcernOther =
    body.primaryHealthConcernOther !== undefined ||
    body.primary_health_concern_other !== undefined ||
    body.healthConcernOther !== undefined ||
    body.health_concern_other !== undefined ||
    body.customHealthConcern !== undefined ||
    body.custom_health_concern !== undefined
      ? primaryHealthConcernOtherRaw || null
      : undefined;
  if (
    primaryHealthConcernOther != null &&
    primaryHealthConcernOther.length > MAX_HEALTH_CONCERN_OTHER_LENGTH
  ) {
    throw new AppError(
      `primaryHealthConcernOther must be at most ${MAX_HEALTH_CONCERN_OTHER_LENGTH} characters`,
      400
    );
  }
  const termsAccepted = parseBool(body.termsAccepted);
  const termsAcceptedAt =
    body.termsAcceptedAt !== undefined ? normalizeDob(body.termsAcceptedAt) : undefined;
  const fcm_id = parseFcmIdFromBody(body);
  const status = body.status !== undefined ? normalizeStatus(body.status) : undefined;
  const profileImage = parseProfileImageFromBody(body.profileImage);

  if (!name) throw new AppError("name is required", 400);
  if (!email) throw new AppError("email is required", 400);
  if (!phone) throw new AppError("phone is required", 400);
  assertValidMobile(phone, { field: "phone", countryCode: phoneCountryCode });
  if (requirePassword && !password) throw new AppError("password is required", 400);

  if (status && !USER_ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active, inactive, or blocked", 400);
  }
  if (gender && !USER_ALLOWED_GENDERS.includes(gender)) {
    throw new AppError("gender is invalid", 400);
  }
  if (dob) {
    const dobDate = String(dob).slice(0, 10);
    const max = new Date();
    max.setHours(0, 0, 0, 0);
    max.setFullYear(max.getFullYear() - 5);
    const y = max.getFullYear();
    const m = String(max.getMonth() + 1).padStart(2, "0");
    const d = String(max.getDate()).padStart(2, "0");
    if (/^\d{4}-\d{2}-\d{2}$/.test(dobDate) && dobDate > `${y}-${m}-${d}`) {
      throw new AppError("Date of birth must be at least 5 years ago", 400);
    }
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
    pincode: pincode ?? null,
    primaryHealthConcern: primaryHealthConcern ?? null,
    primaryHealthConcernOther: primaryHealthConcernOther ?? null,
    termsAccepted: termsAccepted ?? false,
    termsAcceptedAt: termsAcceptedAt ?? null,
    fcm_id: fcm_id ?? null,
    status: status ?? "active",
    profileImage: profileImage !== undefined ? profileImage : null,
  };

  if (whatsappCountryCode !== undefined) fields.whatsappCountryCode = whatsappCountryCode;
  if (whatsappPhone !== undefined) {
    fields.whatsappPhone = whatsappPhone;
    if (whatsappPhone) assertValidMobile(whatsappPhone, { field: "whatsappPhone", countryCode: whatsappCountryCode || phoneCountryCode });
  }

  return { fields, password };
}

async function enrichUser(user, { ensureReferral = true } = {}) {
  if (!user) return null;

  let source = user;
  if (ensureReferral) {
    try {
      const code = await ensureEntityReferralCode({
        tableName: "User",
        entityType: "user",
        entityId: user.id,
        ownerCoachId: String(user.parentCoachId || "").trim() || "pending",
        referralCode: user.referralCode,
      });
      if (code && code !== user.referralCode) {
        source = { ...user, referralCode: code };
      }
    } catch (err) {
      // Non-fatal: profile still returns without blocking on registry issues.
      console.error("[enrichUser] ensure referral code failed", err.message);
    }
  }

  const pub = toPublicUser(source);
  const concernId = pub.primaryHealthConcern;
  if (concernId && typeof concernId === "string") {
    const concern = await getHealthConcernById(concernId);
    if (concern) {
      const isOther =
        String(concern.title || "")
          .trim()
          .toLowerCase() === "other";
      const customTitle =
        isOther && pub.primaryHealthConcernOther
          ? String(pub.primaryHealthConcernOther).trim()
          : "";
      pub.primaryHealthConcern = {
        _id: concern._id || concern.id,
        id: concern.id,
        title: customTitle || concern.title || "",
        description: concern.description || "",
        icon: concern.icon || "",
        status: concern.status || "",
        recommendedCatalogProgramId: concern.recommendedCatalogProgramId || null,
      };
    }
  }

  if (pub.assignedProgramId) {
    try {
      const assignedProgram = await getUserProgramById(pub.assignedProgramId);
      pub.assignedProgram = assignedProgram
        ? toPublicUserProgram(assignedProgram)
        : null;
    } catch (err) {
      console.error("[enrichUser] assigned program lookup failed", err.message);
      pub.assignedProgram = null;
    }
  } else {
    pub.assignedProgram = null;
  }

  if (pub.assignedCoachId && pub.assignedCoachType) {
    if (pub.assignedCoachType === "wellness_coach") {
      const coach =
        (await getWellnessCoachByIdResolved(pub.assignedCoachId)) ||
        (await getWellnessCoachById(pub.assignedCoachId));
      pub.assignedCoach = coach
        ? {
            id: coach.id,
            _id: coach._id ?? coach.id,
            name: coach.name,
            profileImage: resolveCoachProfileImage(coach.profileImage),
            type: "wellness_coach",
          }
        : null;
    } else if (pub.assignedCoachType === "assistant_wellness_coach") {
      const assistant =
        (await getAssistantWellnessCoachByIdResolved(pub.assignedCoachId)) ||
        (await getAssistantWellnessCoachById(pub.assignedCoachId));
      pub.assignedCoach = assistant
        ? {
            id: assistant.id,
            _id: assistant._id ?? assistant.id,
            name: assistant.name,
            profileImage: resolveCoachProfileImage(assistant.profileImage),
            type: "assistant_wellness_coach",
          }
        : null;
    }
  }

  if (pub.parentCoachId) {
    const parentCoach =
      (await getWellnessCoachByIdResolved(pub.parentCoachId)) ||
      (await getWellnessCoachById(pub.parentCoachId));
    if (parentCoach) {
      const welcomeVideo = buildPublicWelcomeVideo(parentCoach);
      pub.parentCoach = {
        id: parentCoach.id,
        _id: parentCoach._id ?? parentCoach.id,
        name: parentCoach.name,
        profileImage: resolveCoachProfileImage(parentCoach.profileImage),
        ...(welcomeVideo ? { welcomeVideo } : {}),
      };
    } else {
      pub.parentCoach = null;
    }
  }

  try {
    const subsResult = await listSubscriptionsByUserId(pub.id, { status: "active", page: 1, limit: 10 });
    const activeSubs = subsResult?.items || [];
    const now = new Date();
    let maxDaysLeft = 0;
    for (const sub of activeSubs) {
      if (sub.endsAt) {
        const diff = Math.ceil((new Date(sub.endsAt) - now) / (1000 * 60 * 60 * 24));
        if (diff > maxDaysLeft) maxDaysLeft = diff;
      }
    }
    pub.subscriptionDaysLeft = maxDaysLeft > 0 ? maxDaysLeft : 0;
  } catch (err) {
    pub.subscriptionDaysLeft = 0;
  }

  return pub;
}

async function assertUniqueEmail(email, excludeUserId) {
  const existing = await getUserByEmail(email);
  if (existing && existing.status !== "deleted" && existing.id !== excludeUserId) {
    throw new AppError("A user already exists with this email", 409);
  }
}

async function assertUniquePhone(phoneCountryCode, phone, excludeUserId) {
  const existing = await getUserByPhone(phoneCountryCode, phone);
  if (existing && existing.status !== "deleted" && existing.id !== excludeUserId) {
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
      if (!nextPhone) throw new AppError("phone cannot be empty", 400);
      assertValidMobile(nextPhone, { field: "phone", countryCode: nextCc });
      await assertUniquePhone(nextCc, nextPhone, current.id);
      updates.phone = nextPhone;
      updates.phoneCountryCode = nextCc;
      updates.phoneKey = buildPhoneKey(nextCc, nextPhone);

      const whatsappSameRaw = parseBool(body.whatsappSameAsMobile);
      const sameAsMobile =
        whatsappSameRaw !== undefined
          ? whatsappSameRaw
          : Boolean(current.whatsappSameAsMobile);
      if (sameAsMobile) {
        updates.whatsappSameAsMobile = true;
        updates.whatsappCountryCode = nextCc;
        updates.whatsappPhone = nextPhone;
      }
    }
  }

  const hasWhatsappFields =
    body.whatsappSameAsMobile !== undefined ||
    body.whatsappCountryCode !== undefined ||
    body.whatsappPhone !== undefined;

  if (hasWhatsappFields) {
    const requested = resolveRequestedWhatsapp(body, current);
    const currentEff = getEffectiveWhatsapp(current);

    if (isWhatsappChanged(current, requested)) {
      const phoneUnchanged =
        normalizePhone(requested.phone) === normalizePhone(currentEff.phone) &&
        normalizeCountryCode(requested.countryCode) ===
          normalizeCountryCode(currentEff.countryCode);

      // Number unchanged — allow flag-only updates (e.g. sameAsMobile after OTP
      // already verified that number). Any actual number change requires OTP.
      if (phoneUnchanged) {
        updates.whatsappSameAsMobile = Boolean(requested.sameAsMobile);
        if (requested.sameAsMobile) {
          const nextCc =
            updates.phoneCountryCode !== undefined
              ? normalizeCountryCode(updates.phoneCountryCode)
              : normalizeCountryCode(current.phoneCountryCode);
          const nextPhone =
            updates.phone !== undefined
              ? normalizePhone(updates.phone)
              : normalizePhone(current.phone);
          updates.whatsappCountryCode = nextCc;
          updates.whatsappPhone = nextPhone;
        }
      } else {
        throw new AppError(
          "WhatsApp number changes require OTP verification. Use /user/auth/profile/whatsapp/otp/send and /verify.",
          400
        );
      }
    } else {
      const whatsappSame = parseBool(body.whatsappSameAsMobile);
      if (whatsappSame !== undefined) updates.whatsappSameAsMobile = whatsappSame;
      if (body.whatsappCountryCode !== undefined) {
        updates.whatsappCountryCode = normalizeCountryCode(body.whatsappCountryCode);
      }
      if (body.whatsappPhone !== undefined) {
        const waPhone = normalizePhone(body.whatsappPhone) || null;
        if (waPhone) {
          assertValidMobile(waPhone, {
            field: "whatsappPhone",
            countryCode: updates.whatsappCountryCode || current.whatsappCountryCode || nextCc,
          });
        }
        updates.whatsappPhone = waPhone;
      }
    }
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
  if (body.addressLine1 !== undefined || body.address_line1 !== undefined) {
    updates.addressLine1 =
      String(body.addressLine1 ?? body.address_line1 ?? "").trim() || null;
  }
  if (body.addressLine2 !== undefined || body.address_line2 !== undefined) {
    updates.addressLine2 =
      String(body.addressLine2 ?? body.address_line2 ?? "").trim() || null;
  }
  if (body.pincode !== undefined) {
    updates.pincode = String(body.pincode || "").trim() || null;
  }
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
    if (updates.termsAccepted && !current.termsAcceptedIp) {
      const ip = getClientIp(req);
      if (ip) updates.termsAcceptedIp = ip;
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

  if (body.presentablePic !== undefined) {
    if (!isPresentablePicsEnabled(current)) {
      throw new AppError("Presentable pics are disabled for this account", 403);
    }
    const presentablePic = parsePresentablePicFromBody(body.presentablePic);
    if (presentablePic === null && current.presentablePic) {
      await deleteStoredMedia(current.presentablePic);
      updates.presentablePic = null;
      updates.presentablePicStatus = null;
      updates.presentablePicReviewedAt = null;
      updates.presentablePicReviewedById = null;
      // Keep `presentablePicHistory` as-is; users can still see previous attempts.
    } else if (presentablePic && presentablePic !== current.presentablePic) {
      const prevHistory = Array.isArray(current.presentablePicHistory)
        ? current.presentablePicHistory
        : [];
      const prevAttempt = current.presentablePic
        ? {
            url: current.presentablePic,
            status: current.presentablePicStatus || "pending",
            uploadedAt: current.presentablePicUploadedAt || current.updatedAt || null,
            reviewedAt: current.presentablePicReviewedAt || null,
            reviewedById: current.presentablePicReviewedById || null,
          }
        : null;

      updates.presentablePicHistory = prevAttempt
        ? [prevAttempt, ...prevHistory].slice(0, 10)
        : prevHistory;

      updates.presentablePic = presentablePic;
      updates.presentablePicStatus = "pending";
      updates.presentablePicUploadedAt = new Date().toISOString();
      updates.presentablePicReviewedAt = null;
      updates.presentablePicReviewedById = null;
    } else if (presentablePic) {
      updates.presentablePic = presentablePic;
    }
  }

  if (req) {
    const uploadedKey = await uploadFileFromRequest(req, "user");
    if (uploadedKey) {
      if (current.profileImage && current.profileImage !== uploadedKey) {
        await deleteStoredMedia(current.profileImage);
      }
      updates.profileImage = uploadedKey;
    }

    const uploadedPresentable = await uploadMulterField(
      req,
      "presentablePic",
      "user/presentable"
    );
    if (uploadedPresentable) {
      if (!isPresentablePicsEnabled(current)) {
        await deleteStoredMedia(uploadedPresentable);
        throw new AppError("Presentable pics are disabled for this account", 403);
      }
      if (current.presentablePic && current.presentablePic !== uploadedPresentable) {
        const prevHistory = Array.isArray(current.presentablePicHistory)
          ? current.presentablePicHistory
          : [];
        const prevAttempt = {
          url: current.presentablePic,
          status: current.presentablePicStatus || "pending",
          uploadedAt: current.presentablePicUploadedAt || current.updatedAt || null,
          reviewedAt: current.presentablePicReviewedAt || null,
          reviewedById: current.presentablePicReviewedById || null,
        };
        // Keep previous media in storage; just reference it in history.
        updates.presentablePicHistory = [prevAttempt, ...prevHistory].slice(0, 10);
      }
      updates.presentablePic = uploadedPresentable;
      updates.presentablePicStatus = "pending";
      updates.presentablePicUploadedAt = new Date().toISOString();
      updates.presentablePicReviewedAt = null;
      updates.presentablePicReviewedById = null;
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
  if (user.presentablePic) await deleteStoredMedia(user.presentablePic);
  if (Array.isArray(user.presentablePicHistory)) {
    for (const item of user.presentablePicHistory) {
      if (item?.url) await deleteStoredMedia(item.url);
    }
  }

  try {
    await deleteUser(user.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("User not found", 404);
    }
    throw err;
  }
}

function isTruthyFlag(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null || value === "") return false;
  const s = String(value).trim().toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return Boolean(value);
}

function getEffectiveWhatsapp(user) {
  if (isTruthyFlag(user.whatsappSameAsMobile)) {
    return {
      sameAsMobile: true,
      countryCode: normalizeCountryCode(user.phoneCountryCode),
      phone: normalizePhone(user.phone),
    };
  }
  return {
    sameAsMobile: false,
    countryCode: normalizeCountryCode(user.whatsappCountryCode),
    phone: normalizePhone(user.whatsappPhone),
  };
}

function resolveRequestedWhatsapp(body, current) {
  const whatsappSameRaw = parseBool(body.whatsappSameAsMobile);
  const sameAsMobile =
    whatsappSameRaw !== undefined
      ? whatsappSameRaw
      : isTruthyFlag(current.whatsappSameAsMobile);

  if (sameAsMobile) {
    const countryCode =
      body.phoneCountryCode !== undefined
        ? normalizeCountryCode(body.phoneCountryCode)
        : normalizeCountryCode(current.phoneCountryCode);
    const phone =
      body.phone !== undefined
        ? normalizePhone(body.phone)
        : normalizePhone(current.phone);
    return {
      sameAsMobile: true,
      countryCode,
      phone,
    };
  }

  const countryCode =
    body.whatsappCountryCode !== undefined
      ? normalizeCountryCode(body.whatsappCountryCode)
      : normalizeCountryCode(current.whatsappCountryCode);
  const phone =
    body.whatsappPhone !== undefined
      ? normalizePhone(body.whatsappPhone) || null
      : normalizePhone(current.whatsappPhone);

  return { sameAsMobile: false, countryCode, phone };
}

function isWhatsappChanged(current, requested) {
  const currentEff = getEffectiveWhatsapp(current);

  if (requested.sameAsMobile !== currentEff.sameAsMobile) return true;
  if (requested.sameAsMobile) return false;

  return (
    normalizePhone(requested.phone) !== normalizePhone(currentEff.phone) ||
    normalizeCountryCode(requested.countryCode) !== normalizeCountryCode(currentEff.countryCode)
  );
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

  const updatePayload = {
    phone: normalizedPhone,
    phoneCountryCode: cc,
    phoneKey: buildPhoneKey(cc, normalizedPhone),
    otp: null,
    otpExpire: null,
    pendingPhone: null,
    pendingPhoneCountryCode: null,
  };

  if (user.whatsappSameAsMobile) {
    updatePayload.whatsappCountryCode = cc;
    updatePayload.whatsappPhone = normalizedPhone;
  }

  const updated = await updateUser(user.id, updatePayload);

  return updated;
}

async function sendProfileWhatsappChangeOtp(user, { whatsappPhone, whatsappCountryCode }) {
  const requested = resolveRequestedWhatsapp(
    { whatsappSameAsMobile: false, whatsappPhone, whatsappCountryCode },
    user
  );

  const normalizedPhone = normalizePhone(requested.phone);
  if (!normalizedPhone) throw new AppError("whatsappPhone is required", 400);
  assertValidIndianMobile(normalizedPhone, { field: "whatsappPhone" });
  const cc = normalizeCountryCode(requested.countryCode || user.whatsappCountryCode);

  const currentEff = getEffectiveWhatsapp(user);
  if (
    normalizePhone(requested.phone) === normalizePhone(currentEff.phone) &&
    normalizeCountryCode(requested.countryCode) === normalizeCountryCode(currentEff.countryCode)
  ) {
    throw new AppError("WhatsApp number is unchanged", 400);
  }

  const otp = generateOtp();
  const otpExpire = getOtpExpiryDate();

  await updateUser(user.id, {
    otp,
    otpExpire,
    pendingWhatsappPhone: normalizedPhone,
    pendingWhatsappCountryCode: cc,
  });

  await deliverOtp({
    phone: normalizedPhone,
    phoneCountryCode: cc,
    otp,
  });

  return { otp, otpExpire };
}

async function verifyProfileWhatsappChangeOtp(user, { whatsappPhone, whatsappCountryCode, otp }) {
  const normalizedPhone = normalizePhone(whatsappPhone);
  if (!normalizedPhone) throw new AppError("whatsappPhone is required", 400);
  const cc = normalizeCountryCode(whatsappCountryCode || user.whatsappCountryCode);
  const code = String(otp ?? "").trim();
  if (!code) throw new AppError("otp is required", 400);

  if (!user.otp || !user.otpExpire) {
    throw new AppError("No OTP requested. Send WhatsApp-change OTP first.", 400);
  }
  if (isOtpExpired(user.otpExpire)) {
    throw new AppError("OTP has expired. Request a new code.", 400);
  }
  if (String(user.otp) !== code) {
    throw new AppError("Invalid OTP", 401);
  }
  if (
    normalizePhone(user.pendingWhatsappPhone) !== normalizedPhone ||
    normalizeCountryCode(user.pendingWhatsappCountryCode) !== cc
  ) {
    throw new AppError("WhatsApp number does not match the pending verification request", 400);
  }

  const matchesMobile =
    normalizedPhone === normalizePhone(user.phone) &&
    cc === normalizeCountryCode(user.phoneCountryCode);

  const updated = await updateUser(user.id, {
    whatsappSameAsMobile: matchesMobile,
    whatsappCountryCode: matchesMobile
      ? normalizeCountryCode(user.phoneCountryCode)
      : cc,
    whatsappPhone: matchesMobile ? normalizePhone(user.phone) : normalizedPhone,
    otp: null,
    otpExpire: null,
    pendingWhatsappPhone: null,
    pendingWhatsappCountryCode: null,
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
  sendProfileWhatsappChangeOtp,
  verifyProfileWhatsappChangeOtp,
};

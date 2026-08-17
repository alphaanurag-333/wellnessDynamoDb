const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadMulterFile,
  deleteStoredMedia,
} = require("../../utils/s3");
const {
  createAppConfig,
  getAppConfig,
  updateAppConfig,
  toPublicAppConfig,
  normalizeBodyMeasurementGuideType,
  normalizeProgressPhotoGuidelines,
  BODY_MEASUREMENT_INFO_IMAGE_FIELDS,
} = require("../../models/appConfigModel");

const S3_FOLDER = "appconfig";
const LOGO_FIELDS = ["admin_logo", "user_logo", "favicon"];
const TEMPLATE_FIELDS = ["commitment_letter_template"];
const BODY_MEASUREMENT_GUIDE_VIDEO_FIELD = "body_measurement_guide_video";
const BODY_MEASUREMENT_INFO_IMAGE_FIELD_SET = new Set(BODY_MEASUREMENT_INFO_IMAGE_FIELDS);
const ALLOWED_TAX_TYPES = new Set(["inclusive", "exclusive"]);
const {
  normalizeFyDiscountRanges,
  normalizeDiscountRange,
} = require("../../utils/energyExchangeDiscountLimits");

function normalizeInclusiveExclusiveType(value, fieldName = "type") {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "";
  if (!ALLOWED_TAX_TYPES.has(normalized)) {
    throw new AppError(`${fieldName} must be inclusive or exclusive`, 400);
  }
  return normalized;
}

function normalizeTaxType(taxType) {
  return normalizeInclusiveExclusiveType(taxType, "tax_type");
}

function parseJSON(value, fallback) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

function normalizeBooleanFlag(value, fallback = false) {
  if (value === undefined || value === null || value === "") return Boolean(fallback);
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
  if (s === "false" || s === "0" || s === "no" || s === "off") return false;
  return Boolean(fallback);
}

function normalizeAppProgramPricing(value) {
  const parsed = parseJSON(value, null);
  if (!Array.isArray(parsed)) {
    throw new AppError("app_program_pricing must be an array", 400);
  }

  const ids = new Set();
  return parsed.map((row, index) => {
    const name = String(row?.name ?? "").trim();
    const amount = Number(row?.amount);
    const discountPercent = Number(row?.discountPercent);
    const validityHours = Number(row?.validityHours);
    const id = String(row?.id || `program-${index + 1}`).trim();

    if (!id || ids.has(id)) {
      throw new AppError("Each program must have a unique id", 400);
    }
    if (!name) {
      throw new AppError(`Program ${index + 1} name is required`, 400);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError(`Program ${index + 1} amount must be greater than 0`, 400);
    }
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      throw new AppError(`Program ${index + 1} discountPercent must be between 0 and 100`, 400);
    }
    if (!Number.isInteger(validityHours) || validityHours <= 0) {
      throw new AppError(`Program ${index + 1} validityHours must be a positive whole number`, 400);
    }

    ids.add(id);
    return { id, name, amount, discountPercent, validityHours };
  });
}

function isVideoMime(mimetype = "") {
  return String(mimetype).toLowerCase().startsWith("video/");
}

function isImageMime(mimetype = "") {
  return String(mimetype).toLowerCase().startsWith("image/");
}

async function s3KeyFromUploadedFile(req, field) {
  const file = req.files?.[field]?.[0];
  if (!file) return undefined;
  return uploadMulterFile(file, S3_FOLDER);
}

async function applyMediaUploads(req, config, updates, fields) {
  for (const field of fields) {
    const uploadedKey = await s3KeyFromUploadedFile(req, field);
    if (!uploadedKey) continue;
    if (field === "commitment_letter_template") {
      const file = req.files?.[field]?.[0];
      if (file?.mimetype && file.mimetype !== "application/pdf") {
        throw new AppError("commitment_letter_template must be a PDF file", 400);
      }
    }
    if (field === BODY_MEASUREMENT_GUIDE_VIDEO_FIELD) {
      const file = req.files?.[field]?.[0];
      if (file?.mimetype && !isVideoMime(file.mimetype)) {
        throw new AppError("body_measurement_guide_video must be a video file", 400);
      }
    }
    if (BODY_MEASUREMENT_INFO_IMAGE_FIELD_SET.has(field)) {
      const file = req.files?.[field]?.[0];
      if (file?.mimetype && !isImageMime(file.mimetype)) {
        throw new AppError(`${field} must be an image file`, 400);
      }
    }
    if (config?.[field]) await deleteStoredMedia(config[field]);
    updates[field] = uploadedKey;
  }
}

async function applyLogoUploads(req, config, updates) {
  await applyMediaUploads(req, config, updates, LOGO_FIELDS);
}

async function applyTemplateUploads(req, config, updates) {
  await applyMediaUploads(req, config, updates, TEMPLATE_FIELDS);
}

async function applyBodyMeasurementGuideVideoUpload(req, config, updates) {
  await applyMediaUploads(req, config, updates, [BODY_MEASUREMENT_GUIDE_VIDEO_FIELD]);
}

async function applyBodyMeasurementInfoImageUploads(req, config, updates) {
  await applyMediaUploads(req, config, updates, BODY_MEASUREMENT_INFO_IMAGE_FIELDS);
}

function applyBodyMeasurementGuideFields(req, config, updates) {
  const typeProvided = req.body.body_measurement_guide_type !== undefined;
  const ytProvided = req.body.body_measurement_guide_yt_link !== undefined;
  const clearVideo =
    req.body.clear_body_measurement_guide_video === true ||
    String(req.body.clear_body_measurement_guide_video || "").toLowerCase() === "true";

  if (!typeProvided && !ytProvided && !clearVideo && !req.files?.[BODY_MEASUREMENT_GUIDE_VIDEO_FIELD]?.[0]) {
    return;
  }

  const nextType = typeProvided
    ? normalizeBodyMeasurementGuideType(req.body.body_measurement_guide_type)
    : normalizeBodyMeasurementGuideType(config?.body_measurement_guide_type);

  if (typeProvided) {
    updates.body_measurement_guide_type = nextType;
  }

  if (nextType === "none") {
    updates.body_measurement_guide_type = "none";
    updates.body_measurement_guide_yt_link = "";
    if (config?.body_measurement_guide_video || updates[BODY_MEASUREMENT_GUIDE_VIDEO_FIELD]) {
      updates[BODY_MEASUREMENT_GUIDE_VIDEO_FIELD] = "";
    }
    return;
  }

  if (nextType === "link") {
    updates.body_measurement_guide_type = "link";
    if (ytProvided) {
      updates.body_measurement_guide_yt_link = String(
        req.body.body_measurement_guide_yt_link || ""
      ).trim();
    }
    if (config?.body_measurement_guide_video || updates[BODY_MEASUREMENT_GUIDE_VIDEO_FIELD]) {
      updates[BODY_MEASUREMENT_GUIDE_VIDEO_FIELD] = "";
    }
    return;
  }

  updates.body_measurement_guide_type = "video";
  updates.body_measurement_guide_yt_link = "";
  if (clearVideo) {
    updates[BODY_MEASUREMENT_GUIDE_VIDEO_FIELD] = "";
  }
}

exports.getAppConfigController = asyncHandler(async (_req, res) => {
  const config = await getAppConfig();
  return res.status(200).json({
    status: true,
    message: "App configuration fetched",
    data: toPublicAppConfig(config),
  });
});

exports.createAppConfigController = asyncHandler(async (req, res) => {
  const existing = await getAppConfig();
  if (existing) {
    throw new AppError(
      "App configuration already exists. Use PATCH /api/admin/app-config to update.",
      409
    );
  }

  const {
    app_name,
    app_email,
    app_mobile,
    app_detail,
    app_version,
    address,
    latitude,
    longitude,
    facebook,
    youtube,
    instagram,
    linkedin,
    app_details,
    app_footer_text,
    payment_gateways,
    improved_user,
    success_rate,
    average_rating,
    happy_clients,
    google_reviews,
    facebook_followers,
    tax_type,
    tax_value,
    referral_discount,
    consultancy_amount,
    subscription_amount,
    app_program_pricing,
    energy_exchange_monthly_amount,
    fy_start_month,
    energy_exchange_default_fy_discounts,
    energy_exchange_fy_discount_ranges,
    energy_exchange_time_based_discount_range,
    multilang,
  } = req.body;

  if (!app_name || !app_email || !app_mobile) {
    throw new AppError("app_name, app_email, and app_mobile are required", 400);
  }

  const config = await createAppConfig();

  const updates = {
    app_name,
    app_email: String(app_email).trim().toLowerCase(),
    app_mobile,
    app_detail: app_detail ?? "",
    app_version: app_version ?? "",
    address: address ?? "",
    latitude: latitude ?? "",
    longitude: longitude ?? "",
    facebook: facebook ?? "",
    youtube: youtube ?? "",
    instagram: instagram ?? "",
    linkedin: linkedin ?? "",
    app_details: app_details ?? "",
    app_footer_text: app_footer_text ?? "",
    improved_user: improved_user ?? "",
    success_rate: success_rate ?? "",
    average_rating: average_rating ?? "",
    happy_clients: happy_clients ?? "",
    google_reviews: google_reviews ?? "",
    facebook_followers: facebook_followers ?? "",
    tax_type: normalizeTaxType(tax_type),
    tax_value: tax_value ?? "",
    referral_discount: referral_discount ?? "",
    consultancy_amount: consultancy_amount ?? "",
    subscription_amount: subscription_amount ?? "",
    app_program_pricing:
      app_program_pricing === undefined
        ? config.app_program_pricing
        : normalizeAppProgramPricing(app_program_pricing),
    energy_exchange_monthly_amount: energy_exchange_monthly_amount ?? "",
    fy_start_month: fy_start_month != null && String(fy_start_month) !== "" ? String(fy_start_month) : "4",
    energy_exchange_default_fy_discounts: parseJSON(
      energy_exchange_default_fy_discounts,
      config.energy_exchange_default_fy_discounts
    ),
    energy_exchange_fy_discount_ranges: normalizeFyDiscountRanges(
      parseJSON(energy_exchange_fy_discount_ranges, config.energy_exchange_fy_discount_ranges)
    ),
    energy_exchange_time_based_discount_range: normalizeDiscountRange(
      parseJSON(
        energy_exchange_time_based_discount_range,
        config.energy_exchange_time_based_discount_range
      )
    ),
    multilang: normalizeBooleanFlag(multilang, false),
    payment_gateways: parseJSON(payment_gateways, config.payment_gateways),
    admin_logo: (await s3KeyFromUploadedFile(req, "admin_logo")) ?? "",
    user_logo: (await s3KeyFromUploadedFile(req, "user_logo")) ?? "",
    favicon: (await s3KeyFromUploadedFile(req, "favicon")) ?? "",
    commitment_letter_template:
      (await s3KeyFromUploadedFile(req, "commitment_letter_template")) ?? "",
  };

  const created = await updateAppConfig(updates);

  return res.status(201).json({
    status: true,
    message: "App configuration created",
    data: toPublicAppConfig(created),
  });
});

exports.updateAppConfigController = asyncHandler(async (req, res) => {
  const config = await getAppConfig();
  if (!config) {
    throw new AppError(
      "App configuration not found. Use POST /api/admin/app-config to create.",
      404
    );
  }

  const scalarFields = [
    "app_name",
    "app_email",
    "app_mobile",
    "app_detail",
    "app_version",
    "address",
    "latitude",
    "longitude",
    "facebook",
    "youtube",
    "instagram",
    "linkedin",
    "app_details",
    "improved_user",
    "success_rate",
    "average_rating",
    "happy_clients",
    "google_reviews",
    "facebook_followers",
    "tax_type",
    "tax_value",
    "referral_discount",
    "consultancy_amount",
    "subscription_amount",
    "energy_exchange_monthly_amount",
    "fy_start_month",
    "app_footer_text",
  ];

  const updates = {};
  for (const field of scalarFields) {
    if (req.body[field] !== undefined) {
      updates[field] =
        field === "app_email"
          ? String(req.body[field]).trim().toLowerCase()
          : field === "tax_type"
            ? normalizeTaxType(req.body[field])
            : req.body[field];
    }
  }

  if (req.body.multilang !== undefined) {
    updates.multilang = normalizeBooleanFlag(req.body.multilang, false);
  }

  if (req.body.payment_gateways !== undefined) {
    updates.payment_gateways = parseJSON(req.body.payment_gateways, config.payment_gateways);
  }

  if (req.body.app_program_pricing !== undefined) {
    updates.app_program_pricing = normalizeAppProgramPricing(req.body.app_program_pricing);
  }

  if (req.body.energy_exchange_default_fy_discounts !== undefined) {
    updates.energy_exchange_default_fy_discounts = parseJSON(
      req.body.energy_exchange_default_fy_discounts,
      config.energy_exchange_default_fy_discounts
    );
  }

  if (req.body.energy_exchange_fy_discount_ranges !== undefined) {
    const parsed = parseJSON(req.body.energy_exchange_fy_discount_ranges, null);
    if (parsed != null) {
      updates.energy_exchange_fy_discount_ranges = normalizeFyDiscountRanges(parsed);
    }
  }

  if (req.body.energy_exchange_time_based_discount_range !== undefined) {
    const parsed = parseJSON(req.body.energy_exchange_time_based_discount_range, null);
    if (parsed != null) {
      updates.energy_exchange_time_based_discount_range = normalizeDiscountRange(parsed);
    }
  }

  if (req.body.progress_photo_guidelines !== undefined) {
    const parsed = parseJSON(req.body.progress_photo_guidelines, null);
    updates.progress_photo_guidelines = normalizeProgressPhotoGuidelines(
      parsed,
      config.progress_photo_guidelines
    );
  }

  await applyLogoUploads(req, config, updates);
  await applyTemplateUploads(req, config, updates);
  await applyBodyMeasurementInfoImageUploads(req, config, updates);

  applyBodyMeasurementGuideFields(req, config, updates);
  const resolvedGuideType = normalizeBodyMeasurementGuideType(
    updates.body_measurement_guide_type ?? config.body_measurement_guide_type
  );
  if (resolvedGuideType === "video") {
    await applyBodyMeasurementGuideVideoUpload(req, config, updates);
  }

  if (
    updates[BODY_MEASUREMENT_GUIDE_VIDEO_FIELD] === "" &&
    config?.[BODY_MEASUREMENT_GUIDE_VIDEO_FIELD]
  ) {
    await deleteStoredMedia(config[BODY_MEASUREMENT_GUIDE_VIDEO_FIELD]);
  }

  const guideTouched =
    req.body.body_measurement_guide_type !== undefined ||
    req.body.body_measurement_guide_yt_link !== undefined ||
    req.body.clear_body_measurement_guide_video !== undefined ||
    Boolean(req.files?.[BODY_MEASUREMENT_GUIDE_VIDEO_FIELD]?.[0]);

  if (guideTouched) {
    const guideYt = String(
      updates.body_measurement_guide_yt_link ??
        config.body_measurement_guide_yt_link ??
        ""
    ).trim();
    const guideVideo =
      updates[BODY_MEASUREMENT_GUIDE_VIDEO_FIELD] !== undefined
        ? updates[BODY_MEASUREMENT_GUIDE_VIDEO_FIELD]
        : config[BODY_MEASUREMENT_GUIDE_VIDEO_FIELD] || "";

    if (resolvedGuideType === "link" && !guideYt) {
      throw new AppError(
        "YouTube link is required for body measurement guide link type",
        400
      );
    }
    if (resolvedGuideType === "video" && !guideVideo) {
      throw new AppError(
        "Video file is required for body measurement guide video type",
        400
      );
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  const updated = await updateAppConfig(updates);

  return res.status(200).json({
    status: true,
    message: "App configuration updated",
    data: toPublicAppConfig(updated),
  });
});

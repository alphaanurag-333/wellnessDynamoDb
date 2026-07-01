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
} = require("../../models/appConfigModel");

const S3_FOLDER = "appconfig";
const LOGO_FIELDS = ["admin_logo", "user_logo", "favicon"];
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

async function s3KeyFromUploadedFile(req, field) {
  const file = req.files?.[field]?.[0];
  if (!file) return undefined;
  return uploadMulterFile(file, S3_FOLDER);
}

async function applyLogoUploads(req, config, updates) {
  for (const field of LOGO_FIELDS) {
    const uploadedKey = await s3KeyFromUploadedFile(req, field);
    if (!uploadedKey) continue;
    if (config?.[field]) await deleteStoredMedia(config[field]);
    updates[field] = uploadedKey;
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
    twitter,
    instagram,
    linkedin,
    app_details,
    app_footer_text,
    payment_gateways,
    improved_user,
    success_rate,
    average_rating,
    happy_clients,
    tax_type,
    tax_value,
    referral_discount,
    consultancy_amount,
    subscription_amount,
    energy_exchange_monthly_amount,
    fy_start_month,
    energy_exchange_default_fy_discounts,
    energy_exchange_fy_discount_ranges,
    energy_exchange_time_based_discount_range,
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
    twitter: twitter ?? "",
    instagram: instagram ?? "",
    linkedin: linkedin ?? "",
    app_details: app_details ?? "",
    app_footer_text: app_footer_text ?? "",
    improved_user: improved_user ?? "",
    success_rate: success_rate ?? "",
    average_rating: average_rating ?? "",
    happy_clients: happy_clients ?? "",
    tax_type: normalizeTaxType(tax_type),
    tax_value: tax_value ?? "",
    referral_discount: referral_discount ?? "",
    consultancy_amount: consultancy_amount ?? "",
    subscription_amount: subscription_amount ?? "",
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
    payment_gateways: parseJSON(payment_gateways, config.payment_gateways),
    admin_logo: (await s3KeyFromUploadedFile(req, "admin_logo")) ?? "",
    user_logo: (await s3KeyFromUploadedFile(req, "user_logo")) ?? "",
    favicon: (await s3KeyFromUploadedFile(req, "favicon")) ?? "",
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
    "twitter",
    "instagram",
    "linkedin",
    "app_details",
    "improved_user",
    "success_rate",
    "average_rating",
    "happy_clients",
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

  if (req.body.payment_gateways !== undefined) {
    updates.payment_gateways = parseJSON(req.body.payment_gateways, config.payment_gateways);
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

  await applyLogoUploads(req, config, updates);

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

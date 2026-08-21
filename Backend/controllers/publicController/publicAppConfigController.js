const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getAppConfig,
  toPublicAppConfig: resolveAppConfigMediaUrls,
  normalizeProgressPhotoGuidelines,
} = require("../../models/appConfigModel");

/**
 * Shape returned to clients without auth — suitable for storefront / login branding.
 * Omits admin-only assets and all payment gateway credentials.
 */
function toPublicClientAppConfig(doc) {
  if (!doc) return null;

  const config = resolveAppConfigMediaUrls(doc);
  const payment_gateways = Array.isArray(config.payment_gateways)
    ? config.payment_gateways.map(({ provider, isActive }) => ({ provider, isActive }))
    : [];

  return {
    app_name: config.app_name,
    app_email: config.app_email,
    app_mobile: config.app_mobile,
    app_detail: config.app_detail ?? "",
    app_version: config.app_version ?? "",
    user_logo: config.user_logo ?? "",
    success_rate: config.success_rate ?? "",
    average_rating: config.average_rating ?? "",
    happy_clients: config.happy_clients ?? "",
    improved_user: config.improved_user ?? "",
    google_reviews: config.google_reviews ?? "",
    facebook_followers: config.facebook_followers ?? "",
    tax_type: config.tax_type ?? "",
    tax_value: config.tax_value ?? "",
    referral_discount: config.referral_discount ?? "",
    consultancy_amount: config.consultancy_amount ?? "",
    favicon: config.favicon ?? "",
    commitment_letter_template: config.commitment_letter_template ?? "",
    commitment_letter_text: config.commitment_letter_text ?? "",
    commitment_letter_version: config.commitment_letter_version ?? 1,
    body_measurement_guide_type: config.body_measurement_guide_type ?? "none",
    body_measurement_guide_title: config.body_measurement_guide_title ?? "",
    body_measurement_guide_description: config.body_measurement_guide_description ?? "",
    body_measurement_guide_yt_link: config.body_measurement_guide_yt_link ?? "",
    body_measurement_guide_video: config.body_measurement_guide_video ?? "",
    body_measurement_info_image_neck: config.body_measurement_info_image_neck ?? "",
    body_measurement_info_image_shoulder: config.body_measurement_info_image_shoulder ?? "",
    body_measurement_info_image_chest: config.body_measurement_info_image_chest ?? "",
    body_measurement_info_image_waist: config.body_measurement_info_image_waist ?? "",
    body_measurement_info_image_hip: config.body_measurement_info_image_hip ?? "",
    body_measurement_info_image_thighs: config.body_measurement_info_image_thighs ?? "",
    progress_photo_guidelines: normalizeProgressPhotoGuidelines(
      config.progress_photo_guidelines
    ),
    health_progress_trackers: Array.isArray(config.health_progress_trackers)
      ? config.health_progress_trackers
      : [],
    web_locations: Array.isArray(config.web_locations) ? config.web_locations : [],
    web_contact_details: Array.isArray(config.web_contact_details)
      ? config.web_contact_details
      : [],
    address: config.address ?? "",
    latitude: config.latitude ?? "",
    longitude: config.longitude ?? "",
    facebook: config.facebook ?? "",
    youtube: config.youtube ?? config.twitter ?? "",
    instagram: config.instagram ?? "",
    linkedin: config.linkedin ?? "",
    app_details: config.app_details ?? "",
    app_footer_text: config.app_footer_text ?? "",
    payment_gateways,
    /** When false, clients hide Hindi and force English */
    multilang: config.multilang === true || String(config.multilang || "").toLowerCase() === "true",
    updatedAt: config.updatedAt,
  };
}

exports.getPublicAppConfig = asyncHandler(async (req, res) => {
  const config = await getAppConfig();
  res.json({
    status: true,
    message: "Public app configuration fetched",
    data: toPublicClientAppConfig(config),
  });
});

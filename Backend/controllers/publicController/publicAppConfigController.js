const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getAppConfig,
  toPublicAppConfig: resolveAppConfigMediaUrls,
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
    tax_type: config.tax_type ?? "",
    tax_value: config.tax_value ?? "",
    referral_discount: config.referral_discount ?? "",
    consultancy_amount: config.consultancy_amount ?? "",
    favicon: config.favicon ?? "",
    commitment_letter_template: config.commitment_letter_template ?? "",
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

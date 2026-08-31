export const APK_LOGO_CROP_WIDTH = 324;
export const APK_LOGO_CROP_HEIGHT = 270;
export const APK_LOGO_SIZE_LABEL = `${APK_LOGO_CROP_WIDTH} × ${APK_LOGO_CROP_HEIGHT}`;

export const LOGO_APP_CONFIG_FIELDS = [
  {
    id: "user_logo",
    field: "user_logo",
    title: "Website logo",
    note: "Header and footer on the site",
    size: "240 × 64",
  },
  {
    id: "admin_logo",
    field: "admin_logo",
    title: "Admin logo",
    note: "Admin console",
    size: "240 × 64",
  },
  {
    id: "favicon",
    field: "favicon",
    title: "Favicon",
    note: "Browser tab",
    size: "64 × 64",
  },
  {
    id: "apk_logo_light",
    field: "apk_logo_light",
    title: "APK logo (light)",
    note: "Phone preview on light backgrounds — hero & download modal",
    size: APK_LOGO_SIZE_LABEL,
  },
  {
    id: "apk_logo_dark",
    field: "apk_logo_dark",
    title: "APK logo (dark)",
    note: "Phone preview on dark backgrounds",
    size: APK_LOGO_SIZE_LABEL,
  },
];

export const LOGO_MAX_SIZE_MB = 25;
export const LOGO_MAX_SIZE_BYTES = LOGO_MAX_SIZE_MB * 1024 * 1024;

export function createDefaultLogoSlots() {
  return LOGO_APP_CONFIG_FIELDS.map((field) => ({
    ...field,
    url: "",
    uploaded: false,
  }));
}

export function mapLogoSlotsFromConfig(config) {
  return LOGO_APP_CONFIG_FIELDS.map((field) => {
    const url = field.field === "apk_logo_light"
      ? String(config?.apk_logo_light || config?.apk_logo || "").trim()
      : String(config?.[field.field] || "").trim();
    return {
      ...field,
      url,
      uploaded: Boolean(url),
    };
  });
}

export function validateLogoFile(file) {
  if (!file) return "Choose an image file";
  const type = String(file.type || "").toLowerCase();
  if (type && !type.startsWith("image/") && type !== "image/x-icon") {
    return "Upload an image file";
  }
  if (file.size > LOGO_MAX_SIZE_BYTES) {
    return `Image must be ${LOGO_MAX_SIZE_MB} MB or smaller`;
  }
  return "";
}

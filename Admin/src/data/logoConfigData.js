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
    const url = String(config?.[field.field] || "").trim();
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

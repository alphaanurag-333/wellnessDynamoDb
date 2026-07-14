import { IMAGE_MAX_SIZE_BYTES } from "../../../utils/mediaUploadValidation.js";

export const NAME_MIN_LEN = 2;
export const NAME_MAX_LEN = 35;
export const DESCRIPTION_MIN_LEN = 5;
export const DESCRIPTION_MAX_LEN =255;
export const UNIT_MAX_LEN = 20;
export const DESCRIPTION_PREVIEW_LEN = 80;
export const LIST_SEARCH_MAX_LEN = 50;
export const LIST_LIMIT = 10;
export { IMAGE_MAX_SIZE_BYTES };
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"]);
export const UNIT_OPTIONS = ["Caps", "Tablets", "Softgels", "Sachets", "ml", "g", "mg", "Drops"];

export function emptyForm() {
  return {
    name: "",
    description: "",
    packSize: "",
    unit: "Caps",
    price: "",
    status: "active",
  };
}

export function sanitizeName(value) {
  return String(value ?? "")
    .replace(/[^\p{L}\p{N}\s.&'+-]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, NAME_MAX_LEN);
}

export function sanitizeNumber(value) {
  return String(value ?? "").replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
}

export function sanitizeDescription(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, DESCRIPTION_MAX_LEN);
}

export function truncate(str, max) {
  const s = String(str ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function formatDate(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `Rs. ${n.toLocaleString()}`;
}

export function isAllowedSupplementImageFile(file) {
  if (!(file instanceof File)) return false;
  return ALLOWED_IMAGE_TYPES.has(file.type);
}

export function validateForm(form, { editId, imageFile, hasExistingImage }) {
  const name = form.name.trim();
  const description = form.description.trim();
  const unit = String(form.unit || "").trim();
  const packSize = Number(form.packSize);
  const price = Number(form.price);
  const status = String(form.status || "").trim();

  if (!name) return "Name is required.";
  if (name.length < NAME_MIN_LEN) return `Name must be at least ${NAME_MIN_LEN} characters.`;
  if (name.length > NAME_MAX_LEN) return `Name cannot exceed ${NAME_MAX_LEN} characters.`;

  if (form.packSize === "" || !Number.isFinite(packSize) || packSize <= 0) {
    return "Pack size must be a number greater than 0.";
  }
  if (!unit) return "Unit is required.";
  if (unit.length > UNIT_MAX_LEN) return `Unit cannot exceed ${UNIT_MAX_LEN} characters.`;
  if (form.price === "" || !Number.isFinite(price) || price < 0) {
    return "Price must be a non-negative number.";
  }

  if (!description) return "Description is required.";
  if (description.length < DESCRIPTION_MIN_LEN) return `Description must be at least ${DESCRIPTION_MIN_LEN} characters.`;
  if (description.length > DESCRIPTION_MAX_LEN) return `Description cannot exceed ${DESCRIPTION_MAX_LEN} characters.`;

  if (status !== "active" && status !== "inactive") return "Status must be active or inactive.";

  if (!editId) {
    if (!(imageFile instanceof File)) return "Please upload an image (JPEG, PNG, GIF, or WebP, max 25 MB).";
  } else if (!(imageFile instanceof File) && !hasExistingImage) {
    return "Upload an image — this record has no image yet.";
  }

  if (imageFile instanceof File) {
    if (!isAllowedSupplementImageFile(imageFile)) return "Image must be a JPEG, PNG, GIF, or WebP image.";
    if (imageFile.size > IMAGE_MAX_SIZE_BYTES) return "Image must be 25 MB or smaller.";
  }

  return "";
}

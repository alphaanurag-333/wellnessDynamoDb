export const TITLE_MAX_LEN = 35;
export const COUPON_CODE_MAX_LEN = 32;
export const LIST_SEARCH_MAX_LEN = 50;
export const LIST_LIMIT = 10;

export const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed amount" },
];

export function emptyForm() {
  return {
    title: "",
    status: "active",
    couponCode: "",
    discountType: "percentage",
    value: "",
  };
}

export function sanitizeTitleInput(value) {
  return String(value ?? "")
    .replace(/[^\p{L}\s]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, TITLE_MAX_LEN);
}

export function sanitizeCouponCodeInput(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, COUPON_CODE_MAX_LEN);
}

export function validateCouponForm(form) {
  const title = String(form.title ?? "").trim();
  const couponCode = String(form.couponCode ?? "").trim();
  const discountType = String(form.discountType || "percentage").trim();
  const valueRaw = form.value;

  if (!title) return "Title is required.";
  if (title.length > TITLE_MAX_LEN) return `Title cannot exceed ${TITLE_MAX_LEN} characters.`;

  if (!couponCode) return "Coupon code is required.";
  if (couponCode.length > COUPON_CODE_MAX_LEN) {
    return `Coupon code cannot exceed ${COUPON_CODE_MAX_LEN} characters.`;
  }

  if (!["percentage", "fixed"].includes(discountType)) {
    return "Discount type must be percentage or fixed.";
  }

  const value = Number(valueRaw);
  if (!Number.isFinite(value) || value < 0) return "Value must be a non-negative number.";
  if (discountType === "percentage" && value > 100) return "Percentage value cannot exceed 100.";

  const status = String(form.status || "").trim();
  if (status && status !== "active" && status !== "inactive") {
    return "Status must be active or inactive.";
  }

  return "";
}

export function getCouponId(row) {
  return row?.id || row?._id || "";
}

export function truncateText(value, maxLen) {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

export function formatDate(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export function formatDiscountType(value) {
  const type = String(value || "").toLowerCase();
  if (type === "percentage") return "Percentage";
  if (type === "fixed") return "Fixed amount";
  return value || "—";
}

export function formatDiscountValue(row) {
  const type = String(row?.discountType || "").toLowerCase();
  const value = row?.value;
  if (value === undefined || value === null || value === "") return "—";
  if (type === "percentage") return `${value}%`;
  return String(value);
}

export function buildCouponPayload(form) {
  return {
    title: String(form.title).trim(),
    status: form.status || "active",
    couponCode: String(form.couponCode).trim().toUpperCase(),
    discountType: form.discountType || "percentage",
    value: Number(form.value),
  };
}

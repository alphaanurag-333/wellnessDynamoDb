import Swal from "sweetalert2";

/** True when value is a finite number greater than 0. */
export function isPositiveNumber(value) {
  if (value === "" || value === null || value === undefined) return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

/** Age in years, inclusive range. */
export function isValidAge(value, { min = 1, max = 120 } = {}) {
  if (value === "" || value === null || value === undefined) return false;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) && n >= min && n <= max;
}

export function isInRange(value, min, max) {
  if (value === "" || value === null || value === undefined) return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
}

/** Height in display units (cm). For ft/in use isValidFeetInches. */
export function isValidHeight(value, unit = "cm") {
  if (unit === "ft") return isInRange(value, 1, 8.5);
  return isInRange(value, 50, 300);
}

/** Separate feet (1–8) and inches (0–11). */
export function isValidFeetInches(feet, inches) {
  return isInRange(feet, 1, 8) && isInRange(inches, 0, 11);
}

export function feetInchesToCm(feet, inches) {
  const totalInches = Number(feet) * 12 + Number(inches || 0);
  if (!Number.isFinite(totalInches) || totalInches <= 0) return 0;
  return totalInches * 2.54;
}

export function cmToFeetInches(cm) {
  const totalInches = Number(cm) / 2.54;
  if (!Number.isFinite(totalInches) || totalInches <= 0) {
    return { feet: "", inches: "" };
  }
  return {
    feet: String(Math.floor(totalInches / 12)),
    inches: String(Math.round(totalInches % 12)),
  };
}

export function formatHeightDisplay(heightUnit, { heightCm, feet, inches }) {
  if (heightUnit === "ft") {
    if (feet === "" || feet == null) return "--";
    const inVal = inches === "" || inches == null ? 0 : inches;
    return `${feet}' ${inVal}"`;
  }
  if (heightCm === "" || heightCm == null) return "--";
  return `${heightCm} cm`;
}

/** Weight in display units (kg or lbs). */
export function isValidWeight(value, unit = "kg") {
  if (unit === "lbs") return isInRange(value, 22, 1100);
  return isInRange(value, 10, 500);
}

/** Body circumference (neck/waist/hip) in cm or in. */
export function isValidMeasurement(value, unit = "cm") {
  if (unit === "in") return isInRange(value, 8, 80);
  return isInRange(value, 20, 200);
}

/**
 * Block typing of -, +, e, E (scientific / negative number entry).
 * Allow digits, one decimal point, and navigation/edit keys.
 */
export function blockInvalidCalculatorNumberKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (["-", "+", "e", "E"].includes(e.key)) {
    e.preventDefault();
  }
}

/** Same as above, plus block decimal for whole-number fields (age, feet, etc.). */
export function blockInvalidIntegerKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (["-", "+", "e", "E", ".", ","].includes(e.key)) {
    e.preventDefault();
  }
}

/**
 * Sanitize free-form input into a non-negative decimal string.
 * Strips letters, signs, and extra dots.
 */
export function sanitizePositiveDecimal(raw, { maxDecimals = 2, max = null } = {}) {
  let s = String(raw ?? "").replace(/[^\d.]/g, "");
  if (!s) return "";

  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    const intPart = s.slice(0, firstDot);
    const decPart = s
      .slice(firstDot + 1)
      .replace(/\./g, "")
      .slice(0, Math.max(0, maxDecimals));
    s = `${intPart}.${decPart}`;
  }

  if (s.startsWith(".")) s = `0${s}`;

  // Cap while typing only when the value is complete enough (not trailing ".")
  if (max != null && s !== "" && !s.endsWith(".")) {
    const n = Number(s);
    if (Number.isFinite(n) && n > max) return String(max);
  }

  return s;
}

/** Non-negative whole numbers only (e.g. age). */
export function sanitizePositiveInteger(raw, { max = null } = {}) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  let n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n)) return "";
  if (max != null && n > max) n = max;
  return String(n);
}

/**
 * @param {{ label: string, valid: boolean, hint?: string }[]} checks
 * @returns {Promise<boolean>} true when all required fields pass
 */
export async function validateCalculatorFields(checks) {
  const failed = (checks || []).filter((c) => !c.valid);
  if (failed.length === 0) return true;

  const items = failed.map((c) => c.hint || c.label);
  const html =
    items.length === 1
      ? `Please enter a valid <strong>${items[0]}</strong>.`
      : `Please correct these fields:<ul style="text-align:left;margin:12px auto 0;padding-left:1.25rem;max-width:320px">${items
          .map((label) => `<li>${label}</li>`)
          .join("")}</ul>`;

  await Swal.fire({
    icon: "warning",
    title: "Invalid or missing values",
    html,
    confirmButtonText: "OK",
    confirmButtonColor: "#ea580c",
  });
  return false;
}

export async function showCalculatorError(title, message) {
  await Swal.fire({
    icon: "error",
    title: title || "Unable to calculate",
    text: message,
    confirmButtonText: "OK",
    confirmButtonColor: "#ea580c",
  });
}

/** Red asterisk used next to required labels. */
export function RequiredMark() {
  return (
    <span className="required-dot" aria-hidden="true">
      *
    </span>
  );
}

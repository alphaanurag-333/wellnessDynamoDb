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
  return Number.isFinite(n) && n >= min && n <= max;
}

/**
 * @param {{ label: string, valid: boolean }[]} checks
 * @returns {Promise<boolean>} true when all required fields pass
 */
export async function validateCalculatorFields(checks) {
  const failed = (checks || []).filter((c) => !c.valid);
  if (failed.length === 0) return true;

  const labels = failed.map((c) => c.label);
  const html =
    labels.length === 1
      ? `Please enter a valid <strong>${labels[0]}</strong>.`
      : `Please fill in these required fields:<ul style="text-align:left;margin:12px auto 0;padding-left:1.25rem;max-width:280px">${labels
          .map((label) => `<li>${label}</li>`)
          .join("")}</ul>`;

  await Swal.fire({
    icon: "warning",
    title: "Required fields missing",
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

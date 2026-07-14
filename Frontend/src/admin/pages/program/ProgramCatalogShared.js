export const LIST_LIMIT = 10;
export const LIST_SEARCH_MAX_LEN = 50;
export const TITLE_MAX_LEN = 200;
export const DESCRIPTION_MAX_LEN = 2000;

export const PROGRAM_TYPE_OPTIONS = [
  { value: "goal_based", label: "Goal Based" },
  { value: "lifetime", label: "Lifetime Membership" },
];

export function programTypeLabel(value) {
  const v = String(value || "").toLowerCase();
  const row = PROGRAM_TYPE_OPTIONS.find((o) => o.value === v);
  return row?.label || value || "—";
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { dateStyle: "medium" });
}

export function formatMoney(value, currency = "INR") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const sym = currency === "INR" ? "₹" : currency;
  return `${sym}${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function emptyForm() {
  return {
    title: "",
    programType: "goal_based",
    description: "",
    price: "",
    currency: "INR",
    status: "active",
  };
}

export function formFromProgram(program) {
  if (!program) return emptyForm();
  const isActive = program.isActive !== false && program.status !== "inactive";
  return {
    title: program.title || "",
    programType: program.programType || "goal_based",
    description: program.description || "",
    price: String(program.price ?? ""),
    currency: program.currency || "INR",
    status: isActive ? "active" : "inactive",
  };
}

export function toPayload(form) {
  const status = form.status === "inactive" ? "inactive" : "active";
  return {
    title: String(form.title || "").trim(),
    programType: form.programType,
    description: String(form.description || "").trim(),
    price: Number(form.price),
    currency: form.currency || "INR",
    status,
    isActive: status === "active",
  };
}

export function validateForm(form) {
  const errors = [];
  if (!String(form.title || "").trim()) errors.push("Title is required");
  if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0) {
    errors.push("Price must be a positive number");
  }
  return errors;
}

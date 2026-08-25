export function categorySlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function categoryTitle(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/[_-]/.test(raw) && /[A-Z]/.test(raw)) return raw;
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function findCategoryOption(value, options = []) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const slug = categorySlug(raw);
  return (
    options.find((row) => row.value === raw || row.label === raw) ||
    options.find(
      (row) => categorySlug(row.value) === slug || categorySlug(row.label) === slug
    ) ||
    null
  );
}

/**
 * Build filter chips: "All" + categories that appear in content rows.
 * Uses dropdown options for labels/order when available.
 */
export function buildContentCategoryChips({
  rows = [],
  options = [],
  allLabel = "All",
}) {
  const present = new Map();

  for (const row of rows) {
    const raw = String(row?.category || "").trim();
    if (!raw) continue;
    const slug = categorySlug(raw);
    if (!slug || present.has(slug)) continue;
    const match = findCategoryOption(raw, options);
    present.set(slug, {
      // Keep the exact stored category so list filters match the API.
      value: raw,
      label: match?.label || categoryTitle(raw),
      sortOrder: Number(match?.sortOrder) || 9999,
    });
  }

  const chips = [...present.values()].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return String(a.label).localeCompare(String(b.label));
  });

  return [{ label: allLabel, value: "" }, ...chips];
}

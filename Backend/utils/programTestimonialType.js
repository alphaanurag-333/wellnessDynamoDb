const TYPE_STOPWORDS = new Set(["reversal", "care", "health", "and", "program", "friendly"]);

function typeKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) {
    return raw.toLowerCase();
  }
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function typeTokens(value) {
  return typeKey(value)
    .split("_")
    .filter((token) => token && !TYPE_STOPWORDS.has(token));
}

/** Treat health-concern slugs (pcod_pcos) as the same family as page types (pcod_pcos_reversal). */
function typesEquivalent(storedType, requestedType) {
  const stored = typeKey(storedType);
  const requested = typeKey(requestedType);
  if (!stored || !requested) return false;
  if (stored === requested) return true;

  const storedTokens = typeTokens(stored);
  const requestedTokens = typeTokens(requested);
  if (!storedTokens.length || !requestedTokens.length) return false;
  return storedTokens.some((token) => requestedTokens.includes(token));
}

module.exports = {
  typeKey,
  typesEquivalent,
};

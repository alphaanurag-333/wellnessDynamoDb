const { v4: uuidv4 } = require("uuid");

const MAX_POINTS = 50;
const MAX_SECTIONS = 20;
const MAX_HEADING_LENGTH = 120;
const MIN_HEADING_LENGTH = 2;
const LEGACY_SECTION_HEADING = "Protocol";

function validationError(message) {
  const err = new Error(message);
  err.name = "ValidationError";
  throw err;
}

function normalizePoints(points, { sectionLabel } = {}) {
  const label = sectionLabel || "A protocol";
  const emptyMessage = sectionLabel
    ? `${sectionLabel} needs at least one point.`
    : "At least one protocol point is required";
  const limitMessage = sectionLabel
    ? `${sectionLabel} cannot have more than ${MAX_POINTS} points.`
    : `A protocol cannot have more than ${MAX_POINTS} points`;

  if (!Array.isArray(points) || points.length === 0) {
    validationError(emptyMessage);
  }
  if (points.length > MAX_POINTS) {
    validationError(limitMessage);
  }

  const next = points
    .map((point) => String(point ?? "").trim())
    .filter(Boolean);

  if (!next.length) {
    validationError(emptyMessage);
  }
  if (next.length > MAX_POINTS) {
    validationError(limitMessage);
  }

  return next;
}

function normalizeHeading(raw, index) {
  const heading = String(raw ?? "").trim();
  const label = `Section ${index + 1}`;
  if (!heading) {
    validationError(`${label} needs a heading.`);
  }
  if (heading.length < MIN_HEADING_LENGTH) {
    validationError(`${label} heading must be at least ${MIN_HEADING_LENGTH} characters.`);
  }
  if (heading.length > MAX_HEADING_LENGTH) {
    validationError(`${label} heading cannot be longer than ${MAX_HEADING_LENGTH} characters.`);
  }
  return heading;
}

function normalizeSections(sections) {
  if (!Array.isArray(sections) || sections.length === 0) {
    validationError("Add at least one section before saving.");
  }
  if (sections.length > MAX_SECTIONS) {
    validationError(`A protocol cannot have more than ${MAX_SECTIONS} sections.`);
  }

  const seen = new Set();
  return sections.map((section, index) => {
    const heading = normalizeHeading(section?.heading ?? section?.title, index);
    const points = normalizePoints(section?.points, { sectionLabel: `Section ${index + 1}` });
    let id = String(section?.id || "").trim();
    if (!id || id.length > 80 || seen.has(id)) id = uuidv4();
    seen.add(id);
    return { id, heading, points };
  });
}

function sectionsFromStored(row) {
  if (Array.isArray(row?.sections) && row.sections.length) {
    return row.sections
      .map((section, index) => ({
        id: String(section?.id || `${row?.id || "section"}-${index}`),
        heading: String(section?.heading || section?.title || "").trim(),
        points: Array.isArray(section?.points)
          ? section.points.map((point) => String(point ?? "").trim()).filter(Boolean)
          : [],
      }))
      .filter((section) => section.heading || section.points.length);
  }

  const points = Array.isArray(row?.points)
    ? row.points.map((point) => String(point ?? "").trim()).filter(Boolean)
    : [];
  if (!points.length) return [];

  return [{
    id: `${row?.id || "legacy"}-section`,
    heading: LEGACY_SECTION_HEADING,
    points,
  }];
}

function flattenSectionPoints(sections) {
  return (Array.isArray(sections) ? sections : []).flatMap((section) => (
    Array.isArray(section?.points) ? section.points : []
  ));
}

module.exports = {
  MAX_POINTS,
  MAX_SECTIONS,
  MAX_HEADING_LENGTH,
  MIN_HEADING_LENGTH,
  LEGACY_SECTION_HEADING,
  normalizePoints,
  normalizeSections,
  sectionsFromStored,
  flattenSectionPoints,
};

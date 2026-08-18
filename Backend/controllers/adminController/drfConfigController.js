const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createDrfSection,
  getDrfSectionById,
  getDrfSectionRecordById,
  updateDrfSection,
  deleteDrfSection,
  listDrfSections,
  listAllSectionsUnpaged,
  normalizeWeight,
  normalizeBool,
  WEIGHT_MAX,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
} = require("../../models/drfSectionModel");
const {
  createDrfSectionQuestion,
  getDrfSectionQuestionById,
  updateDrfSectionQuestion,
  deleteDrfSectionQuestion,
  deleteQuestionsBySectionId,
  listDrfSectionQuestions,
  normalizePoints: normalizeQuestionPoints,
  POINTS_MAX: QUESTION_POINTS_MAX,
} = require("../../models/drfSectionQuestionModel");
const {
  remainingWeight,
  remainingSectionPoints,
  loadNestedConfig,
} = require("../../services/drfConfigService");

const NAME_MAX = 80;
const QUESTION_NAME_MAX = 200;

function handleConditional(err, message) {
  if (err?.name === "ConditionalCheckFailedException") {
    throw new AppError(message, 404);
  }
  throw err;
}

function validateSortOrder(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < SORT_ORDER_MIN || n > SORT_ORDER_MAX) {
    throw new AppError(
      `sortOrder must be a whole number between ${SORT_ORDER_MIN} and ${SORT_ORDER_MAX}`,
      400
    );
  }
  return n;
}

function validateQuestionPoints(value, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new AppError("points is required", 400);
    return undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > QUESTION_POINTS_MAX) {
    throw new AppError(`points must be between 0 and ${QUESTION_POINTS_MAX}`, 400);
  }
  return normalizeQuestionPoints(n);
}

function validateWeight(value, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new AppError("weight is required", 400);
    return undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > WEIGHT_MAX) {
    throw new AppError(`weight must be between 0 and ${WEIGHT_MAX}`, 400);
  }
  return normalizeWeight(n);
}

function parseBool(value) {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  const raw = String(value).toLowerCase().trim();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return Boolean(value);
}

async function loadSectionWithQuestions(sectionId) {
  const section = await getDrfSectionById(sectionId);
  if (!section) return null;
  const data = await listDrfSectionQuestions({ sectionId, page: 1, limit: 500 });
  return { ...section, questions: data.questions || [] };
}

function assertSectionPointsFit(section, { id, points, enabled }) {
  if (enabled === false) return;
  const remaining = remainingSectionPoints(section, { excludeId: id });
  const nextPoints = Number(points) || 0;
  if (nextPoints > remaining) {
    throw new AppError(`Only ${remaining} pts are free in this section`, 400);
  }
}

exports.getDrfConfigController = asyncHandler(async (req, res) => {
  const bundle = await loadNestedConfig();
  return res.status(200).json({
    status: true,
    message: "DRF config fetched successfully",
    ...bundle,
  });
});

exports.listDrfSectionsController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const data = await listDrfSections({ page, limit, status });
  return res.status(200).json({ status: true, sections: data.sections, pagination: data.pagination });
});

exports.getDrfSectionByIdController = asyncHandler(async (req, res) => {
  const section = await loadSectionWithQuestions(req.params.id);
  if (!section) throw new AppError("DRF section not found", 404);
  return res.status(200).json({ status: true, section });
});

exports.createDrfSectionController = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) throw new AppError("name is required", 400);
  if (name.length > NAME_MAX) throw new AppError(`name cannot exceed ${NAME_MAX} characters`, 400);

  const weight = validateWeight(req.body.weight, { required: true });
  if (!weight) throw new AppError("weight must be greater than 0", 400);
  const live = parseBool(req.body.live);
  const fixed = parseBool(req.body.fixed) ?? false;
  const sortOrder = validateSortOrder(req.body.sortOrder);

  if (live !== false) {
    const existing = await listAllSectionsUnpaged();
    const free = remainingWeight(existing);
    if (weight > free) {
      throw new AppError(`Only ${free}% weight is free`, 400);
    }
  }

  const section = await createDrfSection({
    name,
    weight,
    live: live !== false,
    fixed,
    sortOrder,
  });

  return res.status(201).json({
    status: true,
    message: "DRF section created successfully",
    section: { ...section, questions: [] },
  });
});

exports.updateDrfSectionController = asyncHandler(async (req, res) => {
  const current = await getDrfSectionRecordById(req.params.id);
  if (!current) throw new AppError("DRF section not found", 404);
  const publicCurrent = await getDrfSectionById(req.params.id);

  const updates = {};
  if (req.body.name !== undefined) {
    const name = String(req.body.name || "").trim();
    if (!name) throw new AppError("name cannot be empty", 400);
    if (name.length > NAME_MAX) throw new AppError(`name cannot exceed ${NAME_MAX} characters`, 400);
    updates.name = name;
  }
  if (req.body.weight !== undefined) {
    if (publicCurrent.fixed && Number(req.body.weight) !== Number(publicCurrent.weight)) {
      throw new AppError("Fixed section weight cannot be changed", 400);
    }
    const weight = validateWeight(req.body.weight, { required: true });
    if (!weight) throw new AppError("weight must be greater than 0", 400);
    updates.weight = weight;
  }
  if (req.body.live !== undefined) {
    updates.live = parseBool(req.body.live);
    updates.status = updates.live ? "active" : "inactive";
  }
  if (req.body.fixed !== undefined) {
    updates.fixed = normalizeBool(req.body.fixed);
  }
  if (req.body.sortOrder !== undefined) {
    updates.sortOrder = validateSortOrder(req.body.sortOrder);
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").toLowerCase().trim();
    if (!["active", "inactive"].includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
    if (req.body.live === undefined) updates.live = status === "active";
  }

  const nextLive = updates.live !== undefined ? updates.live : publicCurrent.live;
  const nextWeight = updates.weight !== undefined ? updates.weight : publicCurrent.weight;
  if (nextWeight > 0 && nextLive) {
    const existing = await listAllSectionsUnpaged();
    const free = remainingWeight(existing, { excludeId: publicCurrent.id });
    if (nextWeight > free) {
      throw new AppError(`Only ${free}% weight is free`, 400);
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let section;
  try {
    section = await updateDrfSection(req.params.id, updates);
  } catch (err) {
    handleConditional(err, "DRF section not found");
  }

  return res.status(200).json({
    status: true,
    message: "DRF section updated successfully",
    section,
  });
});

exports.deleteDrfSectionController = asyncHandler(async (req, res) => {
  const current = await getDrfSectionById(req.params.id);
  if (!current) throw new AppError("DRF section not found", 404);
  try {
    await deleteQuestionsBySectionId(req.params.id);
    await deleteDrfSection(req.params.id);
  } catch (err) {
    handleConditional(err, "DRF section not found");
  }
  return res.status(200).json({ status: true, message: "DRF section deleted successfully" });
});

exports.listDrfSectionQuestionsController = asyncHandler(async (req, res) => {
  const section = await getDrfSectionById(req.params.sectionId);
  if (!section) throw new AppError("DRF section not found", 404);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 200;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const data = await listDrfSectionQuestions({
    page,
    limit,
    status,
    sectionId: req.params.sectionId,
  });
  return res.status(200).json({
    status: true,
    questions: data.questions,
    pagination: data.pagination,
  });
});

exports.createDrfSectionQuestionController = asyncHandler(async (req, res) => {
  const section = await loadSectionWithQuestions(req.params.sectionId);
  if (!section) throw new AppError("DRF section not found", 404);

  const name = String(req.body.name || req.body.question || "").trim();
  if (!name) throw new AppError("name is required", 400);
  if (name.length > QUESTION_NAME_MAX) {
    throw new AppError(`name cannot exceed ${QUESTION_NAME_MAX} characters`, 400);
  }

  const remaining = remainingSectionPoints(section);
  const defaultPoints = Math.min(10, remaining);
  const points = validateQuestionPoints(req.body.points) ?? defaultPoints;
  const enabled = parseBool(req.body.enabled);
  const fixed = parseBool(req.body.fixed) ?? false;
  const sortOrder = validateSortOrder(req.body.sortOrder);

  assertSectionPointsFit(section, { points, enabled: enabled !== false });

  const question = await createDrfSectionQuestion({
    sectionId: section.id,
    name,
    points,
    enabled: enabled !== false,
    fixed,
    sortOrder,
  });

  return res.status(201).json({
    status: true,
    message: "DRF question created successfully",
    question,
  });
});

exports.updateDrfSectionQuestionController = asyncHandler(async (req, res) => {
  const section = await loadSectionWithQuestions(req.params.sectionId);
  if (!section) throw new AppError("DRF section not found", 404);

  const current = await getDrfSectionQuestionById(req.params.id);
  if (!current || current.sectionId !== section.id) {
    throw new AppError("DRF question not found", 404);
  }

  const updates = {};
  if (req.body.name !== undefined || req.body.question !== undefined) {
    const name = String(req.body.name || req.body.question || "").trim();
    if (!name) throw new AppError("name cannot be empty", 400);
    if (name.length > QUESTION_NAME_MAX) {
      throw new AppError(`name cannot exceed ${QUESTION_NAME_MAX} characters`, 400);
    }
    updates.name = name;
  }
  if (req.body.points !== undefined) {
    if (current.fixed && Number(req.body.points) !== Number(current.points)) {
      throw new AppError("Fixed question points cannot be changed", 400);
    }
    updates.points = validateQuestionPoints(req.body.points, { required: true });
  }
  if (req.body.enabled !== undefined) {
    updates.enabled = parseBool(req.body.enabled);
    updates.status = updates.enabled ? "active" : "inactive";
  }
  if (req.body.fixed !== undefined) {
    updates.fixed = normalizeBool(req.body.fixed);
  }
  if (req.body.sortOrder !== undefined) {
    updates.sortOrder = validateSortOrder(req.body.sortOrder);
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").toLowerCase().trim();
    if (!["active", "inactive"].includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
    if (req.body.enabled === undefined) updates.enabled = status === "active";
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  assertSectionPointsFit(section, {
    id: current.id,
    points: updates.points !== undefined ? updates.points : current.points,
    enabled: updates.enabled !== undefined ? updates.enabled : current.enabled,
  });

  let question;
  try {
    question = await updateDrfSectionQuestion(req.params.id, updates);
  } catch (err) {
    handleConditional(err, "DRF question not found");
  }

  return res.status(200).json({
    status: true,
    message: "DRF question updated successfully",
    question,
  });
});

exports.deleteDrfSectionQuestionController = asyncHandler(async (req, res) => {
  const section = await getDrfSectionById(req.params.sectionId);
  if (!section) throw new AppError("DRF section not found", 404);
  const current = await getDrfSectionQuestionById(req.params.id);
  if (!current || current.sectionId !== section.id) {
    throw new AppError("DRF question not found", 404);
  }
  try {
    await deleteDrfSectionQuestion(req.params.id);
  } catch (err) {
    handleConditional(err, "DRF question not found");
  }
  return res.status(200).json({ status: true, message: "DRF question deleted successfully" });
});

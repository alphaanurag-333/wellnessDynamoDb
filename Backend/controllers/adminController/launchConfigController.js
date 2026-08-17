const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createLaunchRating,
  getLaunchRatingById,
  updateLaunchRating,
  deleteLaunchRating,
  listLaunchRatings,
  listAllRatingsUnpaged,
  normalizeStatus: normalizeRatingStatus,
  normalizeTone,
  normalizeSortOrder: normalizeRatingSortOrder,
  normalizePoints: normalizeRatingPoints,
  ALLOWED_TONES,
  POINTS_MIN: RATING_POINTS_MIN,
  POINTS_MAX: RATING_POINTS_MAX,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
} = require("../../models/launchRatingModel");
const {
  createLaunchDomain,
  getLaunchDomainById,
  getLaunchDomainRecordById,
  updateLaunchDomain,
  deleteLaunchDomain,
  listLaunchDomains,
  listAllDomainsUnpaged,
  normalizeStatus: normalizeDomainStatus,
  normalizeWeight,
  normalizeBool,
  WEIGHT_MAX,
} = require("../../models/launchDomainModel");
const {
  createLaunchDomainQuestion,
  getLaunchDomainQuestionById,
  updateLaunchDomainQuestion,
  deleteLaunchDomainQuestion,
  deleteQuestionsByDomainId,
  listLaunchDomainQuestions,
  listAllQuestionsUnpaged,
  normalizePoints: normalizeQuestionPoints,
  POINTS_MAX: QUESTION_POINTS_MAX,
} = require("../../models/launchDomainQuestionModel");
const {
  remainingWeight,
  remainingDomainPoints,
  isScoredDomain,
  summarizeConfig,
  scoreAnswers,
} = require("../../services/launchScoreService");

const NAME_MAX = 80;
const QUESTION_NAME_MAX = 500;
const DESCRIPTION_MAX = 300;

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
  return normalizeRatingSortOrder(n);
}

function validateRatingPoints(value, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new AppError("points is required", 400);
    return undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < RATING_POINTS_MIN || n > RATING_POINTS_MAX) {
    throw new AppError(`points must be between ${RATING_POINTS_MIN} and ${RATING_POINTS_MAX}`, 400);
  }
  return normalizeRatingPoints(n);
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

async function loadDomainWithQuestions(domainId) {
  const domain = await getLaunchDomainById(domainId);
  if (!domain) return null;
  const data = await listLaunchDomainQuestions({ domainId, page: 1, limit: 500 });
  return { ...domain, questions: data.questions || [] };
}

function assertDomainPointsFit(domain, { id, points, enabled }) {
  if (!isScoredDomain(domain)) return;
  if (enabled === false) return;
  const remaining = remainingDomainPoints(domain, { excludeId: id });
  const nextPoints = Number(points) || 0;
  if (nextPoints > remaining) {
    throw new AppError(`Only ${remaining} pts are free in this domain`, 400);
  }
}

async function loadNestedConfig() {
  const [ratings, domains, questions] = await Promise.all([
    listAllRatingsUnpaged(),
    listAllDomainsUnpaged(),
    listAllQuestionsUnpaged(),
  ]);
  const byDomain = new Map();
  for (const question of questions) {
    const list = byDomain.get(question.domainId) || [];
    list.push(question);
    byDomain.set(question.domainId, list);
  }
  const nested = domains.map((domain) => ({
    ...domain,
    questions: byDomain.get(domain.id) || [],
  }));
  return {
    ratings,
    domains: nested,
    scoring: summarizeConfig({ ratings, domains: nested }),
  };
}

exports.getLaunchConfigController = asyncHandler(async (req, res) => {
  const bundle = await loadNestedConfig();
  return res.status(200).json({
    status: true,
    message: "LAUNCH config fetched successfully",
    ...bundle,
  });
});

exports.scoreLaunchConfigController = asyncHandler(async (req, res) => {
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : null;
  if (!answers) {
    throw new AppError("answers array is required", 400);
  }
  const bundle = await loadNestedConfig();
  const result = scoreAnswers({
    ratings: bundle.ratings,
    domains: bundle.domains,
    answers,
  });
  return res.status(200).json({
    status: true,
    message: "LAUNCH score calculated successfully",
    ...result,
  });
});

exports.listLaunchRatingsController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const data = await listLaunchRatings({ page, limit, status });
  return res.status(200).json({ status: true, ratings: data.ratings, pagination: data.pagination });
});

exports.getLaunchRatingByIdController = asyncHandler(async (req, res) => {
  const rating = await getLaunchRatingById(req.params.id);
  if (!rating) throw new AppError("LAUNCH rating not found", 404);
  return res.status(200).json({ status: true, rating });
});

exports.createLaunchRatingController = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const description = String(req.body.description || "").trim();
  const points = validateRatingPoints(req.body.points, { required: true });
  const tone = req.body.tone ? normalizeTone(req.body.tone) : "default";
  const status = req.body.status ? normalizeRatingStatus(req.body.status) : "active";
  const sortOrder = validateSortOrder(req.body.sortOrder);

  if (!name) throw new AppError("name is required", 400);
  if (!description) throw new AppError("description is required", 400);
  if (name.length > NAME_MAX) throw new AppError(`name cannot exceed ${NAME_MAX} characters`, 400);
  if (description.length > DESCRIPTION_MAX) {
    throw new AppError(`description cannot exceed ${DESCRIPTION_MAX} characters`, 400);
  }
  if (req.body.tone && !ALLOWED_TONES.has(tone)) {
    throw new AppError("tone must be excellent, good, average, poor, or default", 400);
  }

  const rating = await createLaunchRating({
    name,
    badge: req.body.badge,
    tone,
    points,
    description,
    sortOrder,
    status,
  });

  return res.status(201).json({
    status: true,
    message: "LAUNCH rating created successfully",
    rating,
  });
});

exports.updateLaunchRatingController = asyncHandler(async (req, res) => {
  const current = await getLaunchRatingById(req.params.id);
  if (!current) throw new AppError("LAUNCH rating not found", 404);

  const updates = {};
  if (req.body.name !== undefined) {
    const name = String(req.body.name || "").trim();
    if (!name) throw new AppError("name cannot be empty", 400);
    if (name.length > NAME_MAX) throw new AppError(`name cannot exceed ${NAME_MAX} characters`, 400);
    updates.name = name;
    if (req.body.badge === undefined) updates.badge = name.toUpperCase();
  }
  if (req.body.badge !== undefined) {
    const badge = String(req.body.badge || "").trim();
    if (!badge) throw new AppError("badge cannot be empty", 400);
    updates.badge = badge.toUpperCase();
  }
  if (req.body.description !== undefined) {
    const description = String(req.body.description || "").trim();
    if (!description) throw new AppError("description cannot be empty", 400);
    if (description.length > DESCRIPTION_MAX) {
      throw new AppError(`description cannot exceed ${DESCRIPTION_MAX} characters`, 400);
    }
    updates.description = description;
  }
  if (req.body.tone !== undefined) {
    const tone = normalizeTone(req.body.tone);
    if (!ALLOWED_TONES.has(String(req.body.tone || "").toLowerCase().trim()) && String(req.body.tone || "").trim()) {
      throw new AppError("tone must be excellent, good, average, poor, or default", 400);
    }
    updates.tone = tone;
  }
  if (req.body.points !== undefined) {
    updates.points = validateRatingPoints(req.body.points, { required: true });
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
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let rating;
  try {
    rating = await updateLaunchRating(req.params.id, updates);
  } catch (err) {
    handleConditional(err, "LAUNCH rating not found");
  }

  return res.status(200).json({
    status: true,
    message: "LAUNCH rating updated successfully",
    rating,
  });
});

exports.deleteLaunchRatingController = asyncHandler(async (req, res) => {
  const current = await getLaunchRatingById(req.params.id);
  if (!current) throw new AppError("LAUNCH rating not found", 404);
  try {
    await deleteLaunchRating(req.params.id);
  } catch (err) {
    handleConditional(err, "LAUNCH rating not found");
  }
  return res.status(200).json({ status: true, message: "LAUNCH rating deleted successfully" });
});

exports.listLaunchDomainsController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const data = await listLaunchDomains({ page, limit, status });
  return res.status(200).json({ status: true, domains: data.domains, pagination: data.pagination });
});

exports.getLaunchDomainByIdController = asyncHandler(async (req, res) => {
  const domain = await getLaunchDomainById(req.params.id);
  if (!domain) throw new AppError("LAUNCH domain not found", 404);
  const questions = await listLaunchDomainQuestions({ domainId: domain.id, page: 1, limit: 500 });
  return res.status(200).json({
    status: true,
    domain: { ...domain, questions: questions.questions },
  });
});

exports.createLaunchDomainController = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) throw new AppError("name is required", 400);
  if (name.length > NAME_MAX) throw new AppError(`name cannot exceed ${NAME_MAX} characters`, 400);

  const weight = validateWeight(req.body.weight) ?? 0;
  const live = parseBool(req.body.live);
  const fixed = parseBool(req.body.fixed) ?? false;
  const sortOrder = validateSortOrder(req.body.sortOrder);

  if (weight > 0 && live !== false) {
    const existing = await listAllDomainsUnpaged();
    const free = remainingWeight(existing);
    if (weight > free) {
      throw new AppError(`Only ${free}% weight is free`, 400);
    }
  }

  const domain = await createLaunchDomain({
    name,
    weight,
    live: live !== false,
    fixed,
    sortOrder,
  });

  return res.status(201).json({
    status: true,
    message: "LAUNCH domain created successfully",
    domain: { ...domain, questions: [] },
  });
});

exports.updateLaunchDomainController = asyncHandler(async (req, res) => {
  const current = await getLaunchDomainRecordById(req.params.id);
  if (!current) throw new AppError("LAUNCH domain not found", 404);
  const publicCurrent = await getLaunchDomainById(req.params.id);

  const updates = {};
  if (req.body.name !== undefined) {
    const name = String(req.body.name || "").trim();
    if (!name) throw new AppError("name cannot be empty", 400);
    if (name.length > NAME_MAX) throw new AppError(`name cannot exceed ${NAME_MAX} characters`, 400);
    updates.name = name;
  }
  if (req.body.weight !== undefined) {
    if (publicCurrent.fixed && Number(req.body.weight) !== Number(publicCurrent.weight)) {
      throw new AppError("Fixed domain weight cannot be changed", 400);
    }
    updates.weight = validateWeight(req.body.weight, { required: true });
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
    const existing = await listAllDomainsUnpaged();
    const free = remainingWeight(existing, { excludeId: publicCurrent.id });
    if (nextWeight > free) {
      throw new AppError(`Only ${free}% weight is free`, 400);
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let domain;
  try {
    domain = await updateLaunchDomain(req.params.id, updates);
  } catch (err) {
    handleConditional(err, "LAUNCH domain not found");
  }

  return res.status(200).json({
    status: true,
    message: "LAUNCH domain updated successfully",
    domain,
  });
});

exports.deleteLaunchDomainController = asyncHandler(async (req, res) => {
  const current = await getLaunchDomainById(req.params.id);
  if (!current) throw new AppError("LAUNCH domain not found", 404);
  try {
    await deleteQuestionsByDomainId(req.params.id);
    await deleteLaunchDomain(req.params.id);
  } catch (err) {
    handleConditional(err, "LAUNCH domain not found");
  }
  return res.status(200).json({ status: true, message: "LAUNCH domain deleted successfully" });
});

exports.listLaunchDomainQuestionsController = asyncHandler(async (req, res) => {
  const domain = await getLaunchDomainById(req.params.domainId);
  if (!domain) throw new AppError("LAUNCH domain not found", 404);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 200;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const data = await listLaunchDomainQuestions({
    page,
    limit,
    status,
    domainId: req.params.domainId,
  });
  return res.status(200).json({
    status: true,
    questions: data.questions,
    pagination: data.pagination,
  });
});

exports.createLaunchDomainQuestionController = asyncHandler(async (req, res) => {
  const domain = await loadDomainWithQuestions(req.params.domainId);
  if (!domain) throw new AppError("LAUNCH domain not found", 404);

  const name = String(req.body.name || req.body.question || "").trim();
  if (!name) throw new AppError("name is required", 400);
  if (name.length > QUESTION_NAME_MAX) {
    throw new AppError(`name cannot exceed ${QUESTION_NAME_MAX} characters`, 400);
  }

  const remaining = remainingDomainPoints(domain);
  const defaultPoints = Number(domain.weight) > 0 ? Math.min(6, remaining) : 10;
  const points = validateQuestionPoints(req.body.points) ?? defaultPoints;
  const enabled = parseBool(req.body.enabled);
  const fixed = parseBool(req.body.fixed) ?? false;
  const hasInfo = parseBool(req.body.hasInfo);
  const sortOrder = validateSortOrder(req.body.sortOrder);

  assertDomainPointsFit(domain, { points, enabled: enabled !== false });

  const question = await createLaunchDomainQuestion({
    domainId: domain.id,
    name,
    points,
    enabled: enabled !== false,
    fixed,
    hasInfo: hasInfo !== false,
    sortOrder,
  });

  return res.status(201).json({
    status: true,
    message: "LAUNCH question created successfully",
    question,
  });
});

exports.updateLaunchDomainQuestionController = asyncHandler(async (req, res) => {
  const domain = await loadDomainWithQuestions(req.params.domainId);
  if (!domain) throw new AppError("LAUNCH domain not found", 404);

  const current = await getLaunchDomainQuestionById(req.params.id);
  if (!current || current.domainId !== domain.id) {
    throw new AppError("LAUNCH question not found", 404);
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
  if (req.body.hasInfo !== undefined) {
    updates.hasInfo = parseBool(req.body.hasInfo) !== false;
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

  assertDomainPointsFit(domain, {
    id: current.id,
    points: updates.points !== undefined ? updates.points : current.points,
    enabled: updates.enabled !== undefined ? updates.enabled : current.enabled,
  });

  let question;
  try {
    question = await updateLaunchDomainQuestion(req.params.id, updates);
  } catch (err) {
    handleConditional(err, "LAUNCH question not found");
  }

  return res.status(200).json({
    status: true,
    message: "LAUNCH question updated successfully",
    question,
  });
});

exports.deleteLaunchDomainQuestionController = asyncHandler(async (req, res) => {
  const domain = await getLaunchDomainById(req.params.domainId);
  if (!domain) throw new AppError("LAUNCH domain not found", 404);
  const current = await getLaunchDomainQuestionById(req.params.id);
  if (!current || current.domainId !== domain.id) {
    throw new AppError("LAUNCH question not found", 404);
  }
  try {
    await deleteLaunchDomainQuestion(req.params.id);
  } catch (err) {
    handleConditional(err, "LAUNCH question not found");
  }
  return res.status(200).json({ status: true, message: "LAUNCH question deleted successfully" });
});

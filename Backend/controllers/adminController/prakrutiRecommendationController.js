const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { normalizePrakrutiType, PRAKRUTI_TYPES } = require("../../utils/prakrutiConstants");
const {
  createPrakrutiRecommendation,
  getPrakrutiRecommendationById,
  getPrakrutiRecommendationRecordById,
  updatePrakrutiRecommendation,
  deletePrakrutiRecommendation,
  listPrakrutiRecommendations,
  PRAKRUTI_RECOMMENDATION_ALLOWED_STATUS,
} = require("../../models/prakrutiRecommendationModel");

const TITLE_MAX_LEN = 300;

exports.listPrakrutiRecommendationsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search, prakrutiType } = req.query;
  const data = await listPrakrutiRecommendations({ page, limit, status, search, prakrutiType });
  return res.status(200).json({
    status: true,
    recommendations: data.recommendations,
    pagination: data.pagination,
  });
});

exports.getPrakrutiRecommendationByIdController = asyncHandler(async (req, res) => {
  const recommendation = await getPrakrutiRecommendationById(req.params.id);
  if (!recommendation) throw new AppError("Recommendation not found", 404);
  return res.status(200).json({ status: true, recommendation });
});

exports.createPrakrutiRecommendationController = asyncHandler(async (req, res) => {
  const prakrutiType = normalizePrakrutiType(req.body.prakrutiType);
  const title = String(req.body.title || "").trim();
  const status = String(req.body.status || "active").trim().toLowerCase();

  if (!prakrutiType) {
    throw new AppError(`prakrutiType is required (${PRAKRUTI_TYPES.join(", ")})`, 400);
  }
  if (!title) throw new AppError("title is required", 400);
  if (title.length > TITLE_MAX_LEN) throw new AppError(`title cannot exceed ${TITLE_MAX_LEN} characters`, 400);
  if (!PRAKRUTI_RECOMMENDATION_ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  let recommendation;
  try {
    recommendation = await createPrakrutiRecommendation({
      prakrutiType,
      title,
      sortOrder: req.body.sortOrder,
      status,
    });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(201).json({
    status: true,
    message: "Recommendation created successfully",
    recommendation,
  });
});

exports.updatePrakrutiRecommendationController = asyncHandler(async (req, res) => {
  const current = await getPrakrutiRecommendationRecordById(req.params.id);
  if (!current) throw new AppError("Recommendation not found", 404);

  const updates = {};
  if (req.body.prakrutiType !== undefined) {
    const prakrutiType = normalizePrakrutiType(req.body.prakrutiType);
    if (!prakrutiType) {
      throw new AppError(`Invalid prakrutiType (${PRAKRUTI_TYPES.join(", ")})`, 400);
    }
    updates.prakrutiType = prakrutiType;
  }
  if (req.body.title !== undefined) {
    const title = String(req.body.title || "").trim();
    if (!title) throw new AppError("title cannot be empty", 400);
    if (title.length > TITLE_MAX_LEN) throw new AppError(`title cannot exceed ${TITLE_MAX_LEN} characters`, 400);
    updates.title = title;
  }
  if (req.body.sortOrder !== undefined) updates.sortOrder = req.body.sortOrder;
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!PRAKRUTI_RECOMMENDATION_ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let recommendation;
  try {
    recommendation = await updatePrakrutiRecommendation(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Recommendation not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Recommendation updated successfully",
    recommendation,
  });
});

exports.deletePrakrutiRecommendationController = asyncHandler(async (req, res) => {
  const current = await getPrakrutiRecommendationRecordById(req.params.id);
  if (!current) throw new AppError("Recommendation not found", 404);

  try {
    await deletePrakrutiRecommendation(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Recommendation not found", 404);
    }
    throw err;
  }

  return res.status(200).json({ status: true, message: "Recommendation deleted successfully" });
});

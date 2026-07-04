const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createLaunchQuestion,
  getLaunchQuestionById,
  getLaunchQuestionRecordById,
  updateLaunchQuestion,
  deleteLaunchQuestion,
  listLaunchQuestions,
  LAUNCH_QUESTION_ALLOWED_STATUS,
} = require("../../models/launchQuestionModel");

const CATEGORY_MAX_LEN = 35;
const QUESTION_MAX_LEN = 500;
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 100000;

function validateSortOrder(value) {
  if (value === undefined || value === null || value === "") return;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < SORT_ORDER_MIN || n > SORT_ORDER_MAX) {
    throw new AppError(`sortOrder must be a whole number between ${SORT_ORDER_MIN} and ${SORT_ORDER_MAX}`, 400);
  }
}

exports.listLaunchQuestionsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search, category } = req.query;
  const data = await listLaunchQuestions({ page, limit, status, search, category });
  return res.status(200).json({ status: true, questions: data.questions, pagination: data.pagination });
});

exports.getLaunchQuestionByIdController = asyncHandler(async (req, res) => {
  const question = await getLaunchQuestionById(req.params.id);
  if (!question) throw new AppError("LAUNCH question not found", 404);
  return res.status(200).json({ status: true, question });
});

exports.createLaunchQuestionController = asyncHandler(async (req, res) => {
  const category = String(req.body.category || "").trim();
  const question = String(req.body.question || "").trim();
  const status = String(req.body.status || "active").trim().toLowerCase();
  const sortOrder = req.body.sortOrder;

  if (!category) throw new AppError("category is required", 400);
  if (!question) throw new AppError("question is required", 400);
  if (category.length > CATEGORY_MAX_LEN) {
    throw new AppError(`category cannot exceed ${CATEGORY_MAX_LEN} characters`, 400);
  }
  if (question.length > QUESTION_MAX_LEN) {
    throw new AppError(`question cannot exceed ${QUESTION_MAX_LEN} characters`, 400);
  }
  if (!LAUNCH_QUESTION_ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }
  validateSortOrder(sortOrder);

  const created = await createLaunchQuestion({ category, question, sortOrder, status });

  return res.status(201).json({
    status: true,
    message: "LAUNCH question created successfully",
    question: created,
  });
});

exports.updateLaunchQuestionController = asyncHandler(async (req, res) => {
  const current = await getLaunchQuestionRecordById(req.params.id);
  if (!current) throw new AppError("LAUNCH question not found", 404);

  const updates = {};
  if (req.body.category !== undefined) {
    const category = String(req.body.category || "").trim();
    if (!category) throw new AppError("category cannot be empty", 400);
    if (category.length > CATEGORY_MAX_LEN) {
      throw new AppError(`category cannot exceed ${CATEGORY_MAX_LEN} characters`, 400);
    }
    updates.category = category;
  }
  if (req.body.question !== undefined) {
    const question = String(req.body.question || "").trim();
    if (!question) throw new AppError("question cannot be empty", 400);
    if (question.length > QUESTION_MAX_LEN) {
      throw new AppError(`question cannot exceed ${QUESTION_MAX_LEN} characters`, 400);
    }
    updates.question = question;
  }
  if (req.body.sortOrder !== undefined) {
    validateSortOrder(req.body.sortOrder);
    updates.sortOrder = req.body.sortOrder;
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!LAUNCH_QUESTION_ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let question;
  try {
    question = await updateLaunchQuestion(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("LAUNCH question not found", 404);
    }
    throw err;
  }
  return res.status(200).json({
    status: true,
    message: "LAUNCH question updated successfully",
    question,
  });
});

exports.deleteLaunchQuestionController = asyncHandler(async (req, res) => {
  const current = await getLaunchQuestionRecordById(req.params.id);
  if (!current) throw new AppError("LAUNCH question not found", 404);

  try {
    await deleteLaunchQuestion(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("LAUNCH question not found", 404);
    }
    throw err;
  }
  return res.status(200).json({ status: true, message: "LAUNCH question deleted successfully" });
});

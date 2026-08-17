const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createMedicalConditionQuestion,
  getMedicalConditionQuestionById,
  getMedicalConditionQuestionRecordById,
  updateMedicalConditionQuestion,
  deleteMedicalConditionQuestion,
  listMedicalConditionQuestions,
  reorderMedicalConditionQuestions,
  MEDICAL_CONDITION_QUESTION_ALLOWED_STATUS,
  MEDICAL_CONDITION_QUESTION_ALLOWED_ANSWER_TYPE,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
  normalizeSortOrder,
} = require("../../models/medicalConditionQuestionModel");

const QUESTION_MAX_LEN = 300;

function validateSortOrder(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < SORT_ORDER_MIN || n > SORT_ORDER_MAX) {
    throw new AppError(
      `sortOrder must be a whole number between ${SORT_ORDER_MIN} and ${SORT_ORDER_MAX}`,
      400,
    );
  }
  return normalizeSortOrder(n);
}

exports.listMedicalConditionQuestionsController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 200;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const search = req.query.search ? String(req.query.search).trim() : undefined;
  const data = await listMedicalConditionQuestions({ page, limit, status, search });
  return res.status(200).json({ status: true, questions: data.questions, pagination: data.pagination });
});

exports.getMedicalConditionQuestionByIdController = asyncHandler(async (req, res) => {
  const question = await getMedicalConditionQuestionById(req.params.id);
  if (!question) throw new AppError("Medical condition question not found", 404);
  return res.status(200).json({ status: true, question });
});

exports.createMedicalConditionQuestionController = asyncHandler(async (req, res) => {
  const question = String(req.body.question || "").trim();
  const answerType = String(req.body.answerType || "text").trim().toLowerCase();
  const status = String(req.body.status || "active").trim().toLowerCase();
  const sortOrder = validateSortOrder(req.body.sortOrder);

  if (!question) throw new AppError("question is required", 400);
  if (question.length > QUESTION_MAX_LEN) throw new AppError(`question cannot exceed ${QUESTION_MAX_LEN} characters`, 400);
  if (!MEDICAL_CONDITION_QUESTION_ALLOWED_ANSWER_TYPE.includes(answerType)) {
    throw new AppError(`answerType must be one of: ${MEDICAL_CONDITION_QUESTION_ALLOWED_ANSWER_TYPE.join(", ")}`, 400);
  }
  if (!MEDICAL_CONDITION_QUESTION_ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  const created = await createMedicalConditionQuestion({ question, answerType, status, sortOrder });

  return res.status(201).json({
    status: true,
    message: "Medical condition question created successfully",
    question: created,
  });
});

exports.updateMedicalConditionQuestionController = asyncHandler(async (req, res) => {
  const current = await getMedicalConditionQuestionRecordById(req.params.id);
  if (!current) throw new AppError("Medical condition question not found", 404);

  const updates = {};
  if (req.body.question !== undefined) {
    const question = String(req.body.question || "").trim();
    if (!question) throw new AppError("question cannot be empty", 400);
    if (question.length > QUESTION_MAX_LEN) throw new AppError(`question cannot exceed ${QUESTION_MAX_LEN} characters`, 400);
    updates.question = question;
  }
  if (req.body.answerType !== undefined) {
    const answerType = String(req.body.answerType || "").trim().toLowerCase();
    if (!MEDICAL_CONDITION_QUESTION_ALLOWED_ANSWER_TYPE.includes(answerType)) {
      throw new AppError(`answerType must be one of: ${MEDICAL_CONDITION_QUESTION_ALLOWED_ANSWER_TYPE.join(", ")}`, 400);
    }
    updates.answerType = answerType;
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!MEDICAL_CONDITION_QUESTION_ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (req.body.sortOrder !== undefined) {
    updates.sortOrder = validateSortOrder(req.body.sortOrder);
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let question;
  try {
    question = await updateMedicalConditionQuestion(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Medical condition question not found", 404);
    }
    throw err;
  }
  return res.status(200).json({
    status: true,
    message: "Medical condition question updated successfully",
    question,
  });
});

exports.reorderMedicalConditionQuestionsController = asyncHandler(async (req, res) => {
  const orderedIds = Array.isArray(req.body.orderedIds) ? req.body.orderedIds : null;
  if (!orderedIds || orderedIds.length === 0) {
    throw new AppError("orderedIds array is required", 400);
  }

  let questions;
  try {
    questions = await reorderMedicalConditionQuestions(orderedIds);
  } catch (err) {
    if (err?.statusCode === 404 || String(err.message || "").startsWith("Medical condition question not found")) {
      throw new AppError(err.message || "Medical condition question not found", 404);
    }
    if (err?.message === "orderedIds must be unique" || err?.message === "orderedIds is required") {
      throw new AppError(err.message, 400);
    }
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Medical condition question not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Medical condition question order updated successfully",
    questions,
  });
});

exports.deleteMedicalConditionQuestionController = asyncHandler(async (req, res) => {
  const current = await getMedicalConditionQuestionRecordById(req.params.id);
  if (!current) throw new AppError("Medical condition question not found", 404);

  try {
    await deleteMedicalConditionQuestion(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Medical condition question not found", 404);
    }
    throw err;
  }
  return res.status(200).json({ status: true, message: "Medical condition question deleted successfully" });
});

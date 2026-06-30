const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createMedicalConditionQuestion,
  getMedicalConditionQuestionById,
  getMedicalConditionQuestionRecordById,
  updateMedicalConditionQuestion,
  deleteMedicalConditionQuestion,
  listMedicalConditionQuestions,
  MEDICAL_CONDITION_QUESTION_ALLOWED_STATUS,
  MEDICAL_CONDITION_QUESTION_ALLOWED_ANSWER_TYPE,
} = require("../../models/medicalConditionQuestionModel");

const QUESTION_MAX_LEN = 300;

exports.listMedicalConditionQuestionsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
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

  if (!question) throw new AppError("question is required", 400);
  if (question.length > QUESTION_MAX_LEN) throw new AppError(`question cannot exceed ${QUESTION_MAX_LEN} characters`, 400);
  if (!MEDICAL_CONDITION_QUESTION_ALLOWED_ANSWER_TYPE.includes(answerType)) {
    throw new AppError(`answerType must be one of: ${MEDICAL_CONDITION_QUESTION_ALLOWED_ANSWER_TYPE.join(", ")}`, 400);
  }
  if (!MEDICAL_CONDITION_QUESTION_ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  const created = await createMedicalConditionQuestion({ question, answerType, status });

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

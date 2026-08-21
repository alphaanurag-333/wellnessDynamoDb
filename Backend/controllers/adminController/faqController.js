const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createFaq,
  getFaqById,
  updateFaq,
  deleteFaq,
  listFaqs,
  reorderFaqs,
  normalizeStatus,
  normalizeSortOrder,
  normalizeVisibleFlag,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
} = require("../../models/faqModel");

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

exports.listFaqsController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 200;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const search = req.query.search ? String(req.query.search).trim() : undefined;

  const data = await listFaqs({ page, limit, status, search });

  return res.status(200).json({
    status: true,
    faqs: data.faqs,
    pagination: data.pagination,
  });
});

exports.getFaqByIdController = asyncHandler(async (req, res) => {
  const faq = await getFaqById(req.params.id);
  if (!faq) {
    throw new AppError("FAQ not found", 404);
  }

  return res.status(200).json({
    status: true,
    faq,
  });
});

exports.createFaqController = asyncHandler(async (req, res) => {
  const question = String(req.body.question || "").trim();
  const answer = String(req.body.answer || "").trim();
  const status = normalizeStatus(req.body.status, "active");
  const sortOrder = validateSortOrder(req.body.sortOrder);
  const webVisible =
    req.body.webVisible !== undefined ? normalizeVisibleFlag(req.body.webVisible, true) : true;
  const appVisible =
    req.body.appVisible !== undefined ? normalizeVisibleFlag(req.body.appVisible, true) : true;

  if (!question || !answer) {
    throw new AppError("question and answer are required", 400);
  }

  const faq = await createFaq({
    question,
    answer,
    status,
    sortOrder,
    webVisible,
    appVisible,
  });

  return res.status(201).json({
    status: true,
    message: "FAQ created successfully",
    faq,
  });
});

exports.updateFaqController = asyncHandler(async (req, res) => {
  const updates = {};

  if (req.body.question !== undefined) {
    const question = String(req.body.question).trim();
    if (!question) throw new AppError("question cannot be empty", 400);
    updates.question = question;
  }

  if (req.body.answer !== undefined) {
    const answer = String(req.body.answer).trim();
    if (!answer) throw new AppError("answer cannot be empty", 400);
    updates.answer = answer;
  }

  if (req.body.status !== undefined) {
    const status = String(req.body.status).toLowerCase().trim();
    if (!["active", "inactive"].includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }

  if (req.body.sortOrder !== undefined) {
    updates.sortOrder = validateSortOrder(req.body.sortOrder);
  }

  if (req.body.webVisible !== undefined) {
    updates.webVisible = normalizeVisibleFlag(req.body.webVisible, true);
  }

  if (req.body.appVisible !== undefined) {
    updates.appVisible = normalizeVisibleFlag(req.body.appVisible, true);
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let faq;
  try {
    faq = await updateFaq(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("FAQ not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "FAQ updated successfully",
    faq,
  });
});

exports.reorderFaqsController = asyncHandler(async (req, res) => {
  const orderedIds = Array.isArray(req.body.orderedIds) ? req.body.orderedIds : null;
  if (!orderedIds || orderedIds.length === 0) {
    throw new AppError("orderedIds array is required", 400);
  }

  let faqs;
  try {
    faqs = await reorderFaqs(orderedIds);
  } catch (err) {
    if (err?.statusCode === 404 || String(err.message || "").startsWith("FAQ not found")) {
      throw new AppError(err.message || "FAQ not found", 404);
    }
    if (err?.message === "orderedIds must be unique" || err?.message === "orderedIds is required") {
      throw new AppError(err.message, 400);
    }
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("FAQ not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "FAQ order updated successfully",
    faqs,
  });
});

exports.deleteFaqController = asyncHandler(async (req, res) => {
  try {
    await deleteFaq(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("FAQ not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "FAQ deleted successfully",
  });
});

const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { resolvePublicUrl } = require("../../utils/s3");
const {
  getConsultancyTransactionById,
  listTransactionsForAssistant,
  transactionVisibleToAssistant,
  buildEnrolledUsersFromTransactions,
  toPublicTransaction,
} = require("../../models/consultancyTransactionModel");

function enrichTransactionPublic(item) {
  const pub = toPublicTransaction(item);
  if (pub?.invoicePdfKey) pub.invoiceUrl = resolvePublicUrl(pub.invoicePdfKey);
  return pub;
}

exports.listAssistantConsultancyTransactionsController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub || req.user?.id;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const { page = 1, limit = 20, paymentStatus = "all", search } = req.query;
  const data = await listTransactionsForAssistant(assistantId, {
    page,
    limit,
    paymentStatus,
    search,
  });

  const transactions = data.transactions.map((row) => enrichTransactionPublic(row));

  return res.status(200).json({
    status: true,
    message: "Consultancy transactions fetched",
    transactions,
    pagination: data.pagination,
  });
});

exports.listAssistantConsultancyEnrolledUsersController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub || req.user?.id;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const { page = 1, limit = 20, search } = req.query;
  const data = await listTransactionsForAssistant(assistantId, {
    page: 1,
    limit: 500,
    paymentStatus: "paid",
    search,
  });

  let enrolled = buildEnrolledUsersFromTransactions(data.transactions);
  const normalizedSearch = String(search || "").trim().toLowerCase();
  if (normalizedSearch) {
    enrolled = enrolled.filter((row) => {
      const haystack = [row.user?.name, row.user?.email, row.user?.phone, row.latestTransaction?.referenceNumber]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return haystack.includes(normalizedSearch);
    });
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;
  const users = enrolled.slice(skip, skip + safeLimit);

  return res.status(200).json({
    status: true,
    message: "Consultancy enrolled users fetched",
    users,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: enrolled.length,
      pages: Math.max(1, Math.ceil(enrolled.length / safeLimit)),
    },
  });
});

exports.getAssistantConsultancyTransactionController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub || req.user?.id;
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);

  if (!transactionVisibleToAssistant(transaction, assistantId)) {
    throw new AppError("Forbidden", 403);
  }

  return res.status(200).json({
    status: true,
    message: "Transaction fetched",
    transaction: enrichTransactionPublic(transaction),
  });
});

exports.getAssistantConsultancyInvoiceController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub || req.user?.id;
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);
  if (!transactionVisibleToAssistant(transaction, assistantId)) {
    throw new AppError("Forbidden", 403);
  }
  if (!transaction.invoicePdfKey) throw new AppError("Invoice not available", 404);
  return res.redirect(resolvePublicUrl(transaction.invoicePdfKey));
});

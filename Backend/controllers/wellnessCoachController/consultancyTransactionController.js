const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { resolvePublicUrl } = require("../../utils/s3");
const { sendConsultancyInvoicePdf } = require("../../utils/consultancyInvoiceResponse");
const {
  getConsultancyTransactionById,
  listTransactionsForCoach,
  transactionVisibleToCoach,
  buildEnrolledUsersFromTransactions,
  toPublicTransaction,
} = require("../../models/consultancyTransactionModel");

function enrichTransactionPublic(item) {
  const pub = toPublicTransaction(item);
  if (pub?.invoicePdfKey) pub.invoiceUrl = resolvePublicUrl(pub.invoicePdfKey);
  return pub;
}

exports.listCoachConsultancyTransactionsController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub || req.user?.id;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const { page = 1, limit = 20, paymentStatus = "all", search, scope = "all" } = req.query;
  const data = await listTransactionsForCoach(coachId, {
    page,
    limit,
    paymentStatus,
    search,
    scope,
  });

  const transactions = data.transactions.map((row) => {
    const pub = enrichTransactionPublic(row);
    return pub;
  });

  return res.status(200).json({
    status: true,
    message: "Consultancy transactions fetched",
    transactions,
    pagination: data.pagination,
    scope: String(scope || "all").toLowerCase(),
  });
});

exports.listCoachConsultancyEnrolledUsersController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub || req.user?.id;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const { page = 1, limit = 20, search, scope = "all" } = req.query;
  const data = await listTransactionsForCoach(coachId, {
    page: 1,
    limit: 500,
    paymentStatus: "paid",
    search,
    scope,
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

exports.getCoachConsultancyTransactionController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub || req.user?.id;
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);

  if (!transactionVisibleToCoach(transaction, coachId)) {
    throw new AppError("Forbidden", 403);
  }

  return res.status(200).json({
    status: true,
    message: "Transaction fetched",
    transaction: enrichTransactionPublic(transaction),
  });
});

exports.getCoachConsultancyInvoiceController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub || req.user?.id;
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);
  if (!transactionVisibleToCoach(transaction, coachId)) {
    throw new AppError("Forbidden", 403);
  }
  if (String(transaction.paymentStatus || "").toLowerCase() !== "paid") {
    throw new AppError("Invoice not available", 404);
  }
  await sendConsultancyInvoicePdf(res, transaction);
});

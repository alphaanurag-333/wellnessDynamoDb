const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { resolvePublicUrl } = require("../../utils/s3");
const { sendConsultancyInvoicePdf } = require("../../utils/consultancyInvoiceResponse");
const {
  getConsultancyTransactionById,
  listAllTransactionsAcrossStatuses,
  normalizeProductType,
  toPublicTransaction,
} = require("../../models/consultancyTransactionModel");

function enrichTransactionPublic(item) {
  const pub = toPublicTransaction(item);
  if (pub?.invoicePdfKey) pub.invoiceUrl = resolvePublicUrl(pub.invoicePdfKey);
  return pub;
}

function assertProgramTransaction(transaction) {
  if (!transaction) throw new AppError("Transaction not found", 404);
  if (normalizeProductType(transaction.productType) !== "program") {
    throw new AppError("Not a program transaction", 404);
  }
}

exports.listAdminProgramTransactionsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, paymentStatus = "all", coachId, from, to, search } = req.query;

  const data = await listAllTransactionsAcrossStatuses({
    page,
    limit,
    paymentStatus,
    productType: "program",
    coachId,
    fromDate: from,
    toDate: to,
    search,
  });

  return res.status(200).json({
    status: true,
    message: "Program transactions fetched",
    transactions: data.transactions.map(enrichTransactionPublic),
    pagination: data.pagination,
  });
});

exports.getAdminProgramTransactionController = asyncHandler(async (req, res) => {
  const transaction = await getConsultancyTransactionById(req.params.id);
  assertProgramTransaction(transaction);

  return res.status(200).json({
    status: true,
    message: "Transaction fetched",
    transaction: enrichTransactionPublic(transaction),
  });
});

exports.getAdminProgramInvoiceController = asyncHandler(async (req, res) => {
  const transaction = await getConsultancyTransactionById(req.params.id);
  assertProgramTransaction(transaction);
  if (String(transaction.paymentStatus || "").toLowerCase() !== "paid") {
    throw new AppError("Invoice not available", 404);
  }
  await sendConsultancyInvoicePdf(res, transaction);
});

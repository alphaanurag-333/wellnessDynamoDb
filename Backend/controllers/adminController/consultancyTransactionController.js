const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { resolvePublicUrl } = require("../../utils/s3");
const { sendConsultancyInvoicePdf } = require("../../utils/consultancyInvoiceResponse");
const { listUsers } = require("../../models/userModel");
const { enrichUser } = require("../userController/userProfileHelpers");
const {
  getConsultancyTransactionById,
  listAllTransactionsAcrossStatuses,
  normalizeProductType,
  toPublicTransaction,
} = require("../../models/consultancyTransactionModel");
const { queryPartition } = require("../../utils/dynamoList");
const { TABLE } = require("../../models/consultancyTransactionModel");

function enrichTransactionPublic(item) {
  const pub = toPublicTransaction(item);
  if (pub?.invoicePdfKey) pub.invoiceUrl = resolvePublicUrl(pub.invoicePdfKey);
  return pub;
}

exports.listAdminConsultancyTransactionsController = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    paymentStatus = "all",
    referralCode,
    coachId,
    from,
    to,
    search,
  } = req.query;

  const data = await listAllTransactionsAcrossStatuses({
    page,
    limit,
    paymentStatus,
    productType: "consultancy",
    referralCode,
    coachId,
    fromDate: from,
    toDate: to,
    search,
  });

  return res.status(200).json({
    status: true,
    message: "Consultancy transactions fetched",
    transactions: data.transactions.map(enrichTransactionPublic),
    pagination: data.pagination,
  });
});

exports.getAdminConsultancyTransactionController = asyncHandler(async (req, res) => {
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);
  if (normalizeProductType(transaction.productType) !== "consultancy") {
    throw new AppError("Not a consultancy transaction", 404);
  }

  return res.status(200).json({
    status: true,
    message: "Transaction fetched",
    transaction: enrichTransactionPublic(transaction),
  });
});

exports.getAdminConsultancyInvoiceController = asyncHandler(async (req, res) => {
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);
  if (normalizeProductType(transaction.productType) !== "consultancy") {
    throw new AppError("Not a consultancy transaction", 404);
  }
  if (String(transaction.paymentStatus || "").toLowerCase() !== "paid") {
    throw new AppError("Invoice not available", 404);
  }
  await sendConsultancyInvoicePdf(res, transaction);
});

exports.listAdminEnrolledUsersController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, userTier = "heal", coachId } = req.query;
  const userData = await listUsers({ page, limit, search, userTier, status: "active" });

  const paid = await queryPartition({
    tableName: TABLE,
    indexName: "PaymentStatusCreatedAtIndex",
    partitionKeyName: "paymentStatus",
    partitionKeyValue: "paid",
    filterExpression: "#productType = :productType",
    exprNames: { "#productType": "productType" },
    exprValues: { ":productType": "consultancy" },
    page: 1,
    limit: 1000,
  });
  const latestPaidByUser = new Map();
  for (const txn of paid.items) {
    const existing = latestPaidByUser.get(txn.userId);
    if (!existing || String(txn.paidAt || txn.createdAt) > String(existing.paidAt || existing.createdAt)) {
      latestPaidByUser.set(txn.userId, txn);
    }
  }

  let users = await Promise.all(userData.users.map((u) => enrichUser(u)));
  if (coachId) {
    users = users.filter((u) => String(u.parentCoachId || "") === String(coachId));
  }

  const enrolled = users.map((user) => {
    const txn = latestPaidByUser.get(user.id);
    return {
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        phoneCountryCode: user.phoneCountryCode,
        userTier: user.userTier,
        assignmentStatus: user.assignmentStatus,
        assignedCoachId: user.assignedCoachId,
        assignedCoachType: user.assignedCoachType,
        assignedCoach: user.assignedCoach || null,
        parentCoachId: user.parentCoachId,
        parentCoach: user.parentCoach || null,
        referredByCode: user.referredByCode,
        convertedAt: user.convertedAt,
      },
      latestTransaction: txn
        ? {
            id: txn.id,
            referenceNumber: txn.referenceNumber,
            paymentStatus: txn.paymentStatus,
            totalAmount: txn.totalAmount,
            referralCodeUsed: txn.referralCodeUsed,
            healthConcernId: txn.healthConcernId || null,
            healthConcernSnapshot: txn.healthConcernSnapshot || null,
            paidAt: txn.paidAt,
            meetingAssigneeType: txn.meetingAssigneeType,
            meetingAssigneeId: txn.meetingAssigneeId,
          }
        : null,
      enrollmentStatus: txn?.paymentStatus === "paid" ? "enrolled" : user.userTier === "heal" ? "heal_no_payment" : "seek",
    };
  });

  return res.status(200).json({
    status: true,
    message: "Enrolled users fetched",
    users: enrolled,
    pagination: userData.pagination,
  });
});

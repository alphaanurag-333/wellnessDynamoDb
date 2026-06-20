const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { resolvePublicUrl } = require("../../utils/s3");
const { listUsers } = require("../../models/userModel");
const { enrichUser } = require("../userController/userProfileHelpers");
const {
  getConsultancyTransactionById,
  listAllTransactions,
  toPublicTransaction,
} = require("../../models/consultancyTransactionModel");
const { queryPartition } = require("../../utils/dynamoList");
const { TABLE } = require("../../models/consultancyTransactionModel");

function enrichTransactionPublic(item) {
  const pub = toPublicTransaction(item);
  if (pub?.invoicePdfKey) pub.invoiceUrl = resolvePublicUrl(pub.invoicePdfKey);
  return pub;
}

async function listTransactionsAcrossStatuses(options) {
  const status = options.paymentStatus;
  if (status && status !== "all") {
    return listAllTransactions(options);
  }

  const statuses = ["paid", "pending", "failed", "refunded"];
  const merged = new Map();
  for (const paymentStatus of statuses) {
    const chunk = await listAllTransactions({ ...options, paymentStatus, page: 1, limit: 500 });
    for (const row of chunk.transactions) merged.set(row.id, row);
  }

  const all = [...merged.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const safeLimit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
  const safePage = Math.max(Number(options.page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  return {
    transactions: all.slice(skip, skip + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: all.length,
      pages: Math.max(1, Math.ceil(all.length / safeLimit)),
    },
  };
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

  const data = await listTransactionsAcrossStatuses({
    page,
    limit,
    paymentStatus,
    referralCode,
    coachId,
    fromDate: from,
    toDate: to,
    search,
  });

  return res.status(200).json({
    status: true,
    message: "Consultancy transactions fetched",
    transactions: data.transactions,
    pagination: data.pagination,
  });
});

exports.getAdminConsultancyTransactionController = asyncHandler(async (req, res) => {
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);

  return res.status(200).json({
    status: true,
    message: "Transaction fetched",
    transaction: enrichTransactionPublic(transaction),
  });
});

exports.getAdminConsultancyInvoiceController = asyncHandler(async (req, res) => {
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);
  if (!transaction.invoicePdfKey) throw new AppError("Invoice not available", 404);
  return res.redirect(resolvePublicUrl(transaction.invoicePdfKey));
});

exports.listAdminEnrolledUsersController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, userTier = "heal", coachId } = req.query;
  const userData = await listUsers({ page, limit, search, userTier, status: "active" });

  const paid = await queryPartition({
    tableName: TABLE,
    indexName: "PaymentStatusCreatedAtIndex",
    partitionKeyName: "paymentStatus",
    partitionKeyValue: "paid",
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

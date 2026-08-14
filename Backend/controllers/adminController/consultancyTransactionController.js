const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { resolvePublicUrl } = require("../../utils/s3");
const { sendConsultancyInvoicePdf } = require("../../utils/consultancyInvoiceResponse");
const { listUsers, getUserById } = require("../../models/userModel");
const { enrichUser } = require("../userController/userProfileHelpers");
const {
  getConsultancyTransactionById,
  listAllTransactionsAcrossStatuses,
  listTransactionsForCoach,
  transactionVisibleToCoach,
  transactionVisibleToAssistant,
  buildEnrolledUsersFromTransactions,
  supplementEnrolledUsersFromAssignedClients,
  toPublicTransaction,
  updateConsultancyTransaction,
  normalizeConsultancyStatus,
  listTransactionsByUserId,
  normalizeProductType,
} = require("../../models/consultancyTransactionModel");
const { queryPartition } = require("../../utils/dynamoList");
const { TABLE } = require("../../models/consultancyTransactionModel");
const { resolveStaffActor, getStaffScopeCoachId } = require("../staffAccess");

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

exports.listCoachConsultancyTransactionsController = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);
  const coachId = actor.role === "wellness_coach" ? actor.id : getStaffScopeCoachId(req);
  if (!coachId) throw new AppError("Unauthorized", 401);

  const { page = 1, limit = 20, paymentStatus = "paid", search, scope = "all" } = req.query;
  const data = await listTransactionsForCoach(coachId, {
    page,
    limit,
    paymentStatus,
    search,
    scope,
  });

  const transactions = data.transactions.map((row) => enrichTransactionPublic(row));

  return res.status(200).json({
    status: true,
    message: "Consultancy transactions fetched",
    transactions,
    pagination: data.pagination,
    scope: String(scope || "all").toLowerCase(),
  });
});

exports.listCoachConsultancyEnrolledUsersController = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);
  const coachId = actor.role === "wellness_coach" ? actor.id : getStaffScopeCoachId(req);
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
  enrolled = await supplementEnrolledUsersFromAssignedClients(coachId, enrolled, { search, scope });
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
  const actor = resolveStaffActor(req);
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);

  if (actor.role === "admin") {
    if (normalizeProductType(transaction.productType) !== "consultancy") {
      throw new AppError("Not a consultancy transaction", 404);
    }
  } else if (!transactionVisibleToCoach(transaction, actor.id)) {
    throw new AppError("Forbidden", 403);
  }

  return res.status(200).json({
    status: true,
    message: "Transaction fetched",
    transaction: enrichTransactionPublic(transaction),
  });
});

exports.getCoachConsultancyInvoiceController = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);
  if (actor.role === "admin") {
    if (normalizeProductType(transaction.productType) !== "consultancy") {
      throw new AppError("Not a consultancy transaction", 404);
    }
  } else if (!transactionVisibleToCoach(transaction, actor.id)) {
    throw new AppError("Forbidden", 403);
  }
  if (String(transaction.paymentStatus || "").toLowerCase() !== "paid") {
    throw new AppError("Invoice not available", 404);
  }
  await sendConsultancyInvoicePdf(res, transaction);
});

function portalUserCanAccessClient(portalUserId, user, transaction) {
  const id = String(portalUserId || "").trim();
  if (!id) return false;
  if (String(user.parentCoachId || "") === id || String(user.assignedCoachId || "") === id) return true;
  if (transaction && (transactionVisibleToCoach(transaction, id) || transactionVisibleToAssistant(transaction, id))) {
    return true;
  }
  return false;
}

exports.getCoachConsultancyClientController = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);
  const userId = req.params.userId;
  const user = await getUserById(userId);
  if (!user) throw new AppError("Client not found", 404);

  const consultancyTxns = await listTransactionsByUserId(userId, {
    page: 1,
    limit: 10,
    paymentStatus: "paid",
    productType: "consultancy",
  });
  const subscriptionTxns = await listTransactionsByUserId(userId, {
    page: 1,
    limit: 5,
    paymentStatus: "paid",
    productType: "subscription",
  });

  const latestConsultancy = consultancyTxns.items[0] || null;
  if (actor.role !== "admin" && !portalUserCanAccessClient(actor.id, user, latestConsultancy)) {
    throw new AppError("Forbidden", 403);
  }

  return res.status(200).json({
    status: true,
    message: "Client fetched",
    client: {
      user: await enrichUser(user),
      latestConsultancyTransaction: latestConsultancy ? enrichTransactionPublic(latestConsultancy) : null,
      subscriptionActive: subscriptionTxns.items.length > 0 || String(user.userTier || "").toLowerCase() === "heal",
      consultancyTransactions: consultancyTxns.items.map(enrichTransactionPublic),
    },
  });
});

exports.updateCoachConsultancyClientController = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);
  if (actor.role !== "admin") {
    if (
      !transactionVisibleToCoach(transaction, actor.id) &&
      !transactionVisibleToAssistant(transaction, actor.id)
    ) {
      throw new AppError("Forbidden", 403);
    }
  }
  if (String(transaction.paymentStatus || "").toLowerCase() !== "paid") {
    throw new AppError("Only paid consultancy transactions can be updated", 400);
  }

  const updates = {};
  if (req.body?.zoomMeetingLink != null || req.body?.zoom_meeting_link != null) {
    updates.zoomMeetingLink = String(req.body.zoomMeetingLink ?? req.body.zoom_meeting_link).trim() || null;
  }
  if (req.body?.sessionScheduledAt != null || req.body?.session_scheduled_at != null) {
    updates.sessionScheduledAt = req.body.sessionScheduledAt ?? req.body.session_scheduled_at ?? null;
  }
  if (req.body?.consultancyNotes != null || req.body?.consultancy_notes != null) {
    updates.consultancyNotes = String(req.body.consultancyNotes ?? req.body.consultancy_notes).trim() || null;
  }
  if (req.body?.consultancyStatus != null || req.body?.consultancy_status != null) {
    const status = normalizeConsultancyStatus(req.body.consultancyStatus ?? req.body.consultancy_status);
    if (!status) throw new AppError("Invalid consultancy status", 400);
    updates.consultancyStatus = status;
  }

  if (!Object.keys(updates).length) {
    throw new AppError("No valid fields to update", 400);
  }

  const updated = await updateConsultancyTransaction(transaction.id, updates);
  return res.status(200).json({
    status: true,
    message: "Client consultancy record updated",
    transaction: enrichTransactionPublic(updated),
  });
});

exports.listConsultancyTransactionsController = asyncHandler(async (req, res, next) => {
  const actor = resolveStaffActor(req);
  if (actor.role === "admin") {
    return exports.listAdminConsultancyTransactionsController(req, res, next);
  }
  return exports.listCoachConsultancyTransactionsController(req, res, next);
});

exports.listConsultancyEnrolledUsersController = asyncHandler(async (req, res, next) => {
  const actor = resolveStaffActor(req);
  if (actor.role === "admin") {
    return exports.listAdminEnrolledUsersController(req, res, next);
  }
  return exports.listCoachConsultancyEnrolledUsersController(req, res, next);
});

exports.getConsultancyTransactionController = exports.getCoachConsultancyTransactionController;
exports.getConsultancyInvoiceController = exports.getCoachConsultancyInvoiceController;

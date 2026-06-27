const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { resolvePublicUrl } = require("../../utils/s3");
const { sendConsultancyInvoicePdf } = require("../../utils/consultancyInvoiceResponse");
const {
  getConsultancyTransactionById,
  listTransactionsForCoach,
  transactionVisibleToCoach,
  transactionVisibleToAssistant,
  buildEnrolledUsersFromTransactions,
  supplementEnrolledUsersFromAssignedClients,
  toPublicTransaction,
  updateConsultancyTransaction,
  normalizeConsultancyStatus,
  listTransactionsByUserId,
} = require("../../models/consultancyTransactionModel");
const { getUserById } = require("../../models/userModel");
const { enrichUser } = require("../userController/userProfileHelpers");

function enrichTransactionPublic(item) {
  const pub = toPublicTransaction(item);
  if (pub?.invoicePdfKey) pub.invoiceUrl = resolvePublicUrl(pub.invoicePdfKey);
  return pub;
}

exports.listCoachConsultancyTransactionsController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub || req.user?.id;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const { page = 1, limit = 20, paymentStatus = "paid", search, scope = "all" } = req.query;
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
  const portalUserId = req.auth?.sub || req.user?.id;
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
  if (!portalUserCanAccessClient(portalUserId, user, latestConsultancy)) {
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
  const portalUserId = req.auth?.sub || req.user?.id;
  const transaction = await getConsultancyTransactionById(req.params.id);
  if (!transaction) throw new AppError("Transaction not found", 404);
  if (
    !transactionVisibleToCoach(transaction, portalUserId) &&
    !transactionVisibleToAssistant(transaction, portalUserId)
  ) {
    throw new AppError("Forbidden", 403);
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

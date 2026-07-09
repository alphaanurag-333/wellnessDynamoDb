const { TABLE: USER_TABLE } = require("../models/userModel");
const { TABLE: COACH_TABLE } = require("../models/wellnessCoachModel");
const { TABLE: ASSISTANT_TABLE } = require("../models/assistantWellnessCoachModel");
const { TABLE: PROGRAM_TABLE } = require("../models/programCatalogModel");
const {
  sumPaidTransactionTotals,
  listPaidTransactionsForAnalytics,
} = require("../models/consultancyTransactionModel");
const { countAcrossPartitions } = require("../utils/dynamoCount");

const STATUS_INDEX = "StatusCreatedAtIndex";
const USER_TIERS = ["seek", "heal", "consultancy_only"];
const PRODUCT_LABELS = {
  consultancy: "Consultancy",
  program: "Programs",
  energy_exchange: "Energy Exchange",
  subscription: "Subscriptions",
};

function lastNMonthKeys(count = 6) {
  const keys = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
}

function formatMonthLabel(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "short" });
}

function buildRevenueByMonth(transactions, monthKeys) {
  const totals = Object.fromEntries(monthKeys.map((key) => [key, 0]));

  for (const row of transactions) {
    const stamp = String(row.paidAt || row.createdAt || "").slice(0, 7);
    if (!stamp || !(stamp in totals)) continue;
    totals[stamp] += Number(row.totalAmount) || 0;
  }

  return monthKeys.map((key) => ({
    month: key,
    label: formatMonthLabel(key),
    revenue: Math.round((totals[key] + Number.EPSILON) * 100) / 100,
  }));
}

function buildRevenueByProduct(transactions) {
  const totals = new Map();

  for (const row of transactions) {
    const type = String(row.productType || "consultancy").toLowerCase();
    totals.set(type, (totals.get(type) || 0) + (Number(row.totalAmount) || 0));
  }

  return [...totals.entries()]
    .map(([key, value]) => ({
      key,
      name: PRODUCT_LABELS[key] || key.replace(/_/g, " "),
      value: Math.round((value + Number.EPSILON) * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value);
}

async function countUsersByTier(tier) {
  return countAcrossPartitions({
    tableName: USER_TABLE,
    indexName: STATUS_INDEX,
    partitionKeyName: "status",
    partitionValues: ["active", "inactive", "blocked"],
    filterExpression: "#userTier = :userTier",
    exprNames: { "#userTier": "userTier" },
    exprValues: { ":userTier": tier },
  });
}

async function getAdminDashboardStats() {
  const monthKeys = lastNMonthKeys(6);

  const [
    totalUsers,
    activePrograms,
    activeWellnessCoaches,
    activeAssistants,
    pendingCoachApprovals,
    pendingUserAssignments,
    revenue,
    paidTransactions,
    seekUsers,
    healUsers,
    consultancyUsers,
  ] = await Promise.all([
    countAcrossPartitions({
      tableName: USER_TABLE,
      indexName: STATUS_INDEX,
      partitionKeyName: "status",
      partitionValues: ["active", "inactive", "blocked"],
    }),
    countAcrossPartitions({
      tableName: PROGRAM_TABLE,
      indexName: STATUS_INDEX,
      partitionKeyName: "status",
      partitionValues: ["active"],
    }),
    countAcrossPartitions({
      tableName: COACH_TABLE,
      indexName: STATUS_INDEX,
      partitionKeyName: "status",
      partitionValues: ["active"],
    }),
    countAcrossPartitions({
      tableName: ASSISTANT_TABLE,
      indexName: STATUS_INDEX,
      partitionKeyName: "status",
      partitionValues: ["active"],
    }),
    countAcrossPartitions({
      tableName: COACH_TABLE,
      indexName: STATUS_INDEX,
      partitionKeyName: "status",
      partitionValues: ["active", "inactive"],
      filterExpression: "#approvalStatus = :approvalStatus",
      exprNames: { "#approvalStatus": "approvalStatus" },
      exprValues: { ":approvalStatus": "pending" },
    }),
    countAcrossPartitions({
      tableName: USER_TABLE,
      indexName: STATUS_INDEX,
      partitionKeyName: "status",
      partitionValues: ["active", "inactive", "blocked"],
      filterExpression: "#assignmentStatus = :assignmentStatus",
      exprNames: { "#assignmentStatus": "assignmentStatus" },
      exprValues: { ":assignmentStatus": "pending_admin" },
    }),
    sumPaidTransactionTotals(),
    listPaidTransactionsForAnalytics(),
    countUsersByTier("seek"),
    countUsersByTier("heal"),
    countUsersByTier("consultancy_only"),
  ]);

  const userTiers = [
    { key: "seek", name: "Seek (free)", value: seekUsers },
    { key: "heal", name: "Heal (paid)", value: healUsers },
    { key: "consultancy_only", name: "Consultancy only", value: consultancyUsers },
  ];

  const platformOverview = [
    { name: "Users", value: totalUsers, color: "#2563eb" },
    { name: "Coaches", value: activeWellnessCoaches, color: "#a855f7" },
    { name: "Assistants", value: activeAssistants, color: "#6366f1" },
    { name: "Programs", value: activePrograms, color: "#10b981" },
  ];

  const revenueByProduct = buildRevenueByProduct(paidTransactions);
  const productRevenueMap = Object.fromEntries(revenueByProduct.map((row) => [row.key, row.value]));

  return {
    totalUsers,
    activePrograms,
    activeWellnessCoaches,
    activeAssistants,
    pendingApprovals: pendingCoachApprovals + pendingUserAssignments,
    pendingCoachApprovals,
    pendingUserAssignments,
    revenueAndPayouts: revenue.totalAmount,
    consultancyRevenue: productRevenueMap.consultancy ?? 0,
    programRevenue: productRevenueMap.program ?? 0,
    currency: revenue.currency || "INR",
    charts: {
      platformOverview,
      revenueByMonth: buildRevenueByMonth(paidTransactions, monthKeys),
      revenueByProduct: buildRevenueByProduct(paidTransactions),
      userTiers,
    },
  };
}

module.exports = {
  getAdminDashboardStats,
};

const { TABLE: USER_TABLE } = require("../models/userModel");
const { TABLE: COACH_TABLE } = require("../models/wellnessCoachModel");
const { TABLE: ASSISTANT_TABLE } = require("../models/assistantWellnessCoachModel");
const { TABLE: PROGRAM_TABLE } = require("../models/programCatalogModel");
const {
  sumPaidTransactionTotals,
  listPaidTransactionsForAnalytics,
} = require("../models/consultancyTransactionModel");
const { DEFAULT_FY_START_MONTH } = require("./energyExchangePricingService");
const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { countAcrossPartitions } = require("../utils/dynamoCount");

const STATUS_INDEX = "StatusCreatedAtIndex";
const IST_TZ = "Asia/Kolkata";
const PRODUCT_LABELS = {
  consultancy: "Consultancy",
  program: "Programs",
  energy_exchange: "Energy Exchange",
  subscription: "Subscriptions",
};
const PRODUCT_BUCKETS = [
  { key: "program", name: "Wellness program", barName: "Wellness programs", color: "#2b8f5b" },
  { key: "consultancy", name: "PWC", barName: "PWC", color: "#0d9488" },
  { key: "app", name: "App users", barName: "App users", color: "#ec7a45" },
];

function roundMoney(value) {
  return Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;
}

function monthKeyFromDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : "";
}

function formatMonthLabel(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-IN", {
    month: "short",
    timeZone: "UTC",
  });
}

function formatMonthDisplay(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);
  if (!year || !month) return monthKey;
  return `${formatMonthLabel(monthKey)} ${year}`;
}

function formatAsOfLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function fyStartYearFromMonthKey(monthKey, fyStartMonth = DEFAULT_FY_START_MONTH) {
  const [year, month] = String(monthKey).split("-").map(Number);
  if (!year || !month) return null;
  return month >= fyStartMonth ? year : year - 1;
}

function fyLabel(fyStartYear) {
  return `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
}

function elapsedFyMonthKeys(fyStartYear, fyStartMonth = DEFAULT_FY_START_MONTH, now = new Date()) {
  const currentKey = monthKeyFromDate(now);
  const keys = [];
  for (let i = 0; i < 12; i += 1) {
    const absolute = fyStartMonth - 1 + i;
    const year = fyStartYear + Math.floor(absolute / 12);
    const month = (absolute % 12) + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (key > currentKey) break;
    keys.push(key);
  }
  return keys;
}

function productBucket(productType) {
  const type = String(productType || "consultancy").toLowerCase();
  if (type === "program") return "program";
  if (type === "consultancy") return "consultancy";
  return "app";
}

function lastNMonthKeys(count = 6) {
  const keys = [];
  const now = new Date();
  const currentKey = monthKeyFromDate(now);
  const [year, month] = currentKey.split("-").map(Number);
  for (let i = count - 1; i >= 0; i -= 1) {
    const absolute = year * 12 + (month - 1) - i;
    const y = Math.floor(absolute / 12);
    const m = (absolute % 12) + 1;
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return keys;
}

function transactionMonthKey(row) {
  return monthKeyFromDate(row.paidAt || row.createdAt);
}

function buildRevenueByMonth(transactions, monthKeys) {
  const totals = Object.fromEntries(monthKeys.map((key) => [key, 0]));

  for (const row of transactions) {
    const stamp = transactionMonthKey(row);
    if (!stamp || !(stamp in totals)) continue;
    totals[stamp] += Number(row.totalAmount) || 0;
  }

  return monthKeys.map((key) => ({
    month: key,
    label: formatMonthLabel(key),
    revenue: roundMoney(totals[key]),
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
      value: roundMoney(value),
    }))
    .sort((a, b) => b.value - a.value);
}

function emptyBucketTotals() {
  return { program: 0, consultancy: 0, app: 0, total: 0 };
}

function addToBuckets(target, bucket, amount) {
  const value = Number(amount) || 0;
  target[bucket] = (target[bucket] || 0) + value;
  target.total = (target.total || 0) + value;
}

function buildProductRows(totals, { barNames = false } = {}) {
  const total = roundMoney(totals.total);
  return PRODUCT_BUCKETS.map((meta) => {
    const value = roundMoney(totals[meta.key]);
    const pct = total ? Math.round((value / total) * 100) : 0;
    return {
      key: meta.key,
      name: barNames ? meta.barName : meta.name,
      value,
      pct,
      color: meta.color,
    };
  });
}

function buildRevenueAnalytics({
  paidTransactions,
  onboardedByMonth,
  payingClientCount,
  now = new Date(),
} = {}) {
  const fyStartMonth = DEFAULT_FY_START_MONTH;
  const currentMonthKey = monthKeyFromDate(now);
  const currentFyStartYear = fyStartYearFromMonthKey(currentMonthKey, fyStartMonth);
  const allTime = emptyBucketTotals();
  const byMonth = new Map();

  for (const row of paidTransactions || []) {
    const monthKey = transactionMonthKey(row);
    if (!monthKey) continue;
    const amount = Number(row.totalAmount) || 0;
    const bucket = productBucket(row.productType);
    addToBuckets(allTime, bucket, amount);
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, emptyBucketTotals());
    addToBuckets(byMonth.get(monthKey), bucket, amount);
  }

  const fyYears = new Set([currentFyStartYear, currentFyStartYear - 1]);
  for (const monthKey of byMonth.keys()) {
    const year = fyStartYearFromMonthKey(monthKey, fyStartMonth);
    if (year) fyYears.add(year);
  }
  for (const monthKey of Object.keys(onboardedByMonth || {})) {
    const year = fyStartYearFromMonthKey(monthKey, fyStartMonth);
    if (year) fyYears.add(year);
  }

  const financialYears = [...fyYears]
    .sort((a, b) => b - a)
    .map((fyStartYear) => {
      const months = elapsedFyMonthKeys(fyStartYear, fyStartMonth, now).map((monthKey) => {
        const totals = byMonth.get(monthKey) || emptyBucketTotals();
        const rounded = {
          program: roundMoney(totals.program),
          consultancy: roundMoney(totals.consultancy),
          app: roundMoney(totals.app),
          total: roundMoney(totals.total),
        };
        return {
          month: monthKey,
          label: formatMonthLabel(monthKey),
          displayLabel: formatMonthDisplay(monthKey),
          ...rounded,
          products: buildProductRows(rounded, { barNames: true }),
        };
      });
      const onboarded = months.map((row) => ({
        month: row.month,
        label: row.label,
        count: Number(onboardedByMonth?.[row.month]) || 0,
      }));
      return {
        fyStartYear,
        label: fyLabel(fyStartYear),
        months,
        onboarded,
        onboardedTotal: onboarded.reduce((sum, row) => sum + row.count, 0),
      };
    });

  const totalRevenue = roundMoney(allTime.total);
  const products = buildProductRows(allTime);

  return {
    asOf: now.toISOString(),
    asOfLabel: formatAsOfLabel(now),
    fyStartMonth,
    currentFyStartYear,
    currentMonth: currentMonthKey,
    totalRevenue,
    products,
    avgPerClient: payingClientCount ? roundMoney(totalRevenue / payingClientCount) : 0,
    payingClientCount,
    financialYears,
  };
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

async function scanUserAnalytics() {
  const counts = new Map();
  const onboardedByMonth = {};
  let lastKey;

  do {
    const { Items = [], LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: USER_TABLE,
        ProjectionExpression: "primaryHealthConcern, #status, createdAt",
        FilterExpression: "#status IN (:active, :inactive, :blocked)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":active": "active",
          ":inactive": "inactive",
          ":blocked": "blocked",
        },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const user of Items) {
      const concernId = String(user.primaryHealthConcern || "").trim();
      if (concernId) counts.set(concernId, (counts.get(concernId) || 0) + 1);
      const monthKey = monthKeyFromDate(user.createdAt);
      if (monthKey) onboardedByMonth[monthKey] = (onboardedByMonth[monthKey] || 0) + 1;
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return {
    healthConcernCounts: Object.fromEntries(counts),
    onboardedByMonth,
  };
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
    maintenanceUsers,
    userAnalytics,
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
    countUsersByTier("maintenance"),
    scanUserAnalytics(),
  ]);

  const { healthConcernCounts, onboardedByMonth } = userAnalytics;
  const payingClientCount = healUsers + consultancyUsers + maintenanceUsers;
  const revenueAnalytics = buildRevenueAnalytics({
    paidTransactions,
    onboardedByMonth,
    payingClientCount,
  });

  const userTiers = [
    { key: "seek", name: "Seek (free)", value: seekUsers },
    { key: "heal", name: "Heal (paid)", value: healUsers },
    { key: "consultancy_only", name: "Consultancy only", value: consultancyUsers },
    { key: "maintenance", name: "Maintenance", value: maintenanceUsers },
  ];

  const platformOverview = [
    { name: "Users", value: totalUsers, color: "#2563eb" },
    { name: "Coaches", value: activeWellnessCoaches, color: "#a855f7" },
    { name: "Assistants", value: activeAssistants, color: "#6366f1" },
    { name: "Programs", value: activePrograms, color: "#10b981" },
  ];

  const revenueByProduct = buildRevenueByProduct(paidTransactions);
  const productRevenueMap = Object.fromEntries(revenueByProduct.map((row) => [row.key, row.value]));
  const currentFy = revenueAnalytics.financialYears.find(
    (fy) => fy.fyStartYear === revenueAnalytics.currentFyStartYear,
  );

  return {
    totalUsers,
    activePrograms,
    activeWellnessCoaches,
    activeAssistants,
    pendingApprovals: pendingCoachApprovals + pendingUserAssignments,
    pendingCoachApprovals,
    pendingUserAssignments,
    healthConcernCounts,
    revenueAndPayouts: revenue.totalAmount,
    consultancyRevenue: productRevenueMap.consultancy ?? 0,
    programRevenue: productRevenueMap.program ?? 0,
    currency: revenue.currency || "INR",
    revenueAnalytics,
    charts: {
      platformOverview,
      revenueByMonth: currentFy
        ? currentFy.months.map((row) => ({
            month: row.month,
            label: row.label,
            revenue: row.total,
            program: row.program,
            consultancy: row.consultancy,
            app: row.app,
          }))
        : buildRevenueByMonth(paidTransactions, monthKeys),
      revenueByProduct: revenueAnalytics.products,
      userTiers,
    },
  };
}

module.exports = {
  getAdminDashboardStats,
  buildRevenueAnalytics,
};

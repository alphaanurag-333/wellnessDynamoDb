const { TABLE: USER_TABLE, getUserById, listUsersByParentCoachId } = require("../models/userModel");
const { normalizeUserTier } = require("../models/userAssignmentLogic");
const { TABLE: COACH_TABLE, getWellnessCoachById } = require("../models/wellnessCoachModel");
const { countAccountsByRoleKey } = require("../models/accountModel");
const { TABLE: PROGRAM_TABLE } = require("../models/programCatalogModel");
const { listRoles } = require("../models/roleModel");
const { countAccountsByConsoleRoleId } = require("../models/accountModel");
const { ROLE_KEY_META, UI_TO_ACCOUNT_ROLE } = require("../config/consolePermissionCatalog");
const {
  sumPaidTransactionTotals,
  listPaidTransactionsForAnalytics,
  listAllTransactions,
} = require("../models/consultancyTransactionModel");
const { paginateItems } = require("../utils/dynamoList");
const { DEFAULT_FY_START_MONTH } = require("./energyExchangePricingService");
const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { countAcrossPartitions } = require("../utils/dynamoCount");
const { getSubscriptionExpiryStats } = require("./subscriptionExpiryStats");

const STATUS_INDEX = "StatusCreatedAtIndex";
const IST_TZ = "Asia/Kolkata";
const CONSOLE_SCOPE = "CONSOLE";
const TEAM_ROLE_ORDER = ["wc", "awc", "trainee", "support"];
const CUSTOM_ROLE_COLORS = ["#db2777", "#ea580c", "#0284c7", "#4f46e5", "#0f766e", "#b45309"];

function colorForCustomRole(id) {
  const seed = String(id || "");
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return CUSTOM_ROLE_COLORS[hash % CUSTOM_ROLE_COLORS.length];
}

function pendingChip(count, singular, plural) {
  const n = Number(count) || 0;
  if (n <= 0) return null;
  return {
    label: `${n} ${n === 1 ? singular : plural}`,
    bg: "#fdf3ec",
    color: "#c2661d",
  };
}

async function countMembersForConsoleRole(role) {
  const roleKey = String(role?.roleKey || "").trim().toLowerCase();
  const accountRole = UI_TO_ACCOUNT_ROLE[roleKey] || null;
  const isSystem = Boolean(roleKey && ROLE_KEY_META[roleKey]);
  try {
    if (isSystem && accountRole) {
      return await countAccountsByConsoleRoleId(role.id, {
        accountRoleKey: accountRole,
        includeUnassigned: true,
      });
    }
    return await countAccountsByConsoleRoleId(role.id);
  } catch {
    return 0;
  }
}

function pendingForTeamRole(roleKey, stats) {
  if (roleKey !== "wc") return [];
  return [
    pendingChip(stats.pendingUserAssignments, "assignment pending", "assignments pending"),
    pendingChip(stats.pendingCoachApprovals, "coach approval pending", "coach approvals pending"),
  ].filter(Boolean);
}

async function buildTeamRoleCards(stats = {}) {
  try {
    const { roles } = await listRoles({
      scope: CONSOLE_SCOPE,
      status: "active",
      page: 1,
      limit: 100,
    });
    const visible = (roles || []).filter(
      (role) => String(role.roleKey || "").toLowerCase() !== "admin",
    );
    const counts = await Promise.all(visible.map((role) => countMembersForConsoleRole(role)));
    const cards = visible.map((role, index) => {
      const roleKey = String(role.roleKey || "").trim().toLowerCase();
      const meta = ROLE_KEY_META[roleKey] || {};
      const isSystem = Boolean(roleKey && ROLE_KEY_META[roleKey]);
      return {
        id: role.id,
        roleKey: roleKey || role.id,
        name: role.name || meta.name || "Role",
        memberCount: counts[index] || 0,
        color: role.uiMeta?.color || meta.color || (isSystem ? "#5e6ad2" : colorForCustomRole(role.id)),
        pending: pendingForTeamRole(roleKey, stats),
      };
    });
    cards.sort((a, b) => {
      const ai = TEAM_ROLE_ORDER.indexOf(a.roleKey);
      const bi = TEAM_ROLE_ORDER.indexOf(b.roleKey);
      if (ai === -1 && bi === -1) return String(a.name).localeCompare(String(b.name));
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return cards;
  } catch {
    return [];
  }
}
const PRODUCT_LABELS = {
  consultancy: "Consultancy",
  program: "Programs",
  challenge: "Challenges",
  energy_exchange: "Energy Exchange",
  subscription: "Subscriptions",
};
const PRODUCT_BUCKETS = [
  { key: "program", name: "Wellness program", barName: "Wellness programs", color: "#2b8f5b" },
  { key: "consultancy", name: "PWC", barName: "PWC", color: "#0d9488" },
  { key: "challenge", name: "Challenges", barName: "Challenges", color: "#7c3aed" },
  { key: "app", name: "App users", barName: "App users", color: "#ec7a45" },
];

const DASHBOARD_PAYMENT_BUCKETS = {
  consultancy: {
    key: "consultancy",
    label: "PWC",
    productTypes: ["consultancy"],
  },
  program: {
    key: "program",
    label: "Program fees",
    productTypes: ["program"],
  },
  challenge: {
    key: "challenge",
    label: "Challenges",
    productTypes: ["challenge"],
  },
  app: {
    key: "app",
    label: "App subscription",
    productTypes: ["subscription", "energy_exchange"],
  },
};

const DASHBOARD_PAYMENT_BUCKET_ORDER = ["consultancy", "program", "challenge", "app"];

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

function dayKeyFromDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : "";
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
  if (type === "challenge") return "challenge";
  return "app";
}

function snapshotName(value) {
  if (!value || typeof value !== "object") return "";
  return String(value.name || "").trim();
}

function formatPaymentDateLabel(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TZ,
    day: "numeric",
    month: "short",
  }).format(date);
}

function paymentProgramLabel(row) {
  const type = String(row.productType || "consultancy").toLowerCase();
  const catalog = String(
    row.userSnapshot?.catalogItemName ||
      row.userSnapshot?.programTitle ||
      row.userSnapshot?.challengeTitle ||
      row.userSnapshot?.healthConcernTitle ||
      "",
  ).trim();
  const concern = String(row.healthConcernSnapshot?.title || "").trim();
  const name = catalog || concern;

  if (type === "program") return name || "Wellness program";
  if (type === "consultancy") return "Consultation";
  if (type === "challenge") return name || "Challenge";
  if (type === "subscription" || type === "energy_exchange") {
    if (!name) return type === "energy_exchange" ? "Energy Exchange" : "App user";
    if (/^app user/i.test(name)) return name;
    return `App user · ${name}`;
  }
  return name || type.replace(/_/g, " ");
}

function toPaymentRow(row, coachNames, usersById = new Map()) {
  const user = usersById.get(String(row.userId || row.userSnapshot?.id || "").trim()) || null;
  const parentId = String(row.parentCoachId || user?.parentCoachId || "").trim();
  const assignedCoachId = String(user?.assignedCoachId || row.meetingAssigneeId || "").trim();
  const assignedCoachType = String(user?.assignedCoachType || row.assigneeSnapshot?.type || "").toLowerCase();
  const assigneeName = snapshotName(row.assigneeSnapshot);
  const coachName =
    (parentId && coachNames.get(parentId)) ||
    (assignedCoachType === "wellness_coach" && assignedCoachId && coachNames.get(assignedCoachId)) ||
    (assignedCoachType === "wellness_coach" ? assigneeName : "") ||
    assigneeName ||
    "—";
  const paidAt = row.paidAt || row.createdAt;
  const healthConcernId = String(
    row.healthConcernId ||
      row.healthConcernSnapshot?.id ||
      user?.primaryHealthConcern ||
      "",
  ).trim();
  return {
    id: row.id,
    userId: row.userId || row.userSnapshot?.id || user?.id || null,
    userName: snapshotName(row.userSnapshot) || user?.name || "Client",
    coachName,
    programType: paymentProgramLabel(row),
    healthConcernId: healthConcernId || null,
    productType: String(row.productType || "").toLowerCase() || null,
    dateLabel: formatPaymentDateLabel(paidAt),
    paidAt,
    amount: roundMoney(row.totalAmount),
  };
}

async function loadCoachNamesById(ids) {
  const unique = [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const byId = new Map();
  await Promise.all(
    unique.map(async (id) => {
      try {
        const coach = await getWellnessCoachById(id);
        const name = String(coach?.name || "").trim();
        if (name) byId.set(id, name);
      } catch {
        /* ignore missing coaches */
      }
    }),
  );
  return byId;
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
  return { program: 0, consultancy: 0, challenge: 0, app: 0, total: 0 };
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
  coachNames = new Map(),
  usersById = new Map(),
  now = new Date(),
} = {}) {
  const fyStartMonth = DEFAULT_FY_START_MONTH;
  const currentMonthKey = monthKeyFromDate(now);
  const currentFyStartYear = fyStartYearFromMonthKey(currentMonthKey, fyStartMonth);
  const allTime = emptyBucketTotals();
  const byMonth = new Map();
  const paymentsByMonth = new Map();

  for (const row of paidTransactions || []) {
    const monthKey = transactionMonthKey(row);
    if (!monthKey) continue;
    const amount = Number(row.totalAmount) || 0;
    const bucket = productBucket(row.productType);
    addToBuckets(allTime, bucket, amount);
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, emptyBucketTotals());
    addToBuckets(byMonth.get(monthKey), bucket, amount);
    if (!paymentsByMonth.has(monthKey)) paymentsByMonth.set(monthKey, []);
    paymentsByMonth.get(monthKey).push(toPaymentRow(row, coachNames, usersById));
  }

  for (const list of paymentsByMonth.values()) {
    list.sort((a, b) => String(b.paidAt || "").localeCompare(String(a.paidAt || "")));
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
          challenge: roundMoney(totals.challenge),
          app: roundMoney(totals.app),
          total: roundMoney(totals.total),
        };
        return {
          month: monthKey,
          label: formatMonthLabel(monthKey),
          displayLabel: formatMonthDisplay(monthKey),
          ...rounded,
          products: buildProductRows(rounded, { barNames: true }),
          payments: paymentsByMonth.get(monthKey) || [],
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

async function countUsersByClientCategory(category) {
  return countAcrossPartitions({
    tableName: USER_TABLE,
    indexName: STATUS_INDEX,
    partitionKeyName: "status",
    partitionValues: ["active", "inactive", "blocked"],
    filterExpression: "#clientCategory = :clientCategory",
    exprNames: { "#clientCategory": "clientCategory" },
    exprValues: { ":clientCategory": category },
  });
}

async function scanUserAnalytics() {
  const counts = new Map();
  const onboardedByMonth = {};
  const usersById = new Map();
  let registeredTodayCount = 0;
  const todayKey = dayKeyFromDate(new Date());
  let lastKey;

  do {
    const { Items = [], LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: USER_TABLE,
        ProjectionExpression: "id, #name, primaryHealthConcern, parentCoachId, assignedCoachId, assignedCoachType, #status, createdAt",
        FilterExpression: "#status IN (:active, :inactive, :blocked)",
        ExpressionAttributeNames: { "#status": "status", "#name": "name" },
        ExpressionAttributeValues: {
          ":active": "active",
          ":inactive": "inactive",
          ":blocked": "blocked",
        },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const user of Items) {
      const id = String(user.id || "").trim();
      const concernId = String(user.primaryHealthConcern?.id || user.primaryHealthConcern || "").trim();
      if (id) {
        usersById.set(id, {
          name: String(user.name || "").trim(),
          parentCoachId: String(user.parentCoachId || "").trim(),
          assignedCoachId: String(user.assignedCoachId || "").trim(),
          assignedCoachType: String(user.assignedCoachType || "").trim(),
          primaryHealthConcern: concernId,
        });
      }
      if (concernId) counts.set(concernId, (counts.get(concernId) || 0) + 1);
      if (todayKey && dayKeyFromDate(user.createdAt) === todayKey) {
        registeredTodayCount += 1;
      }
      const monthKey = monthKeyFromDate(user.createdAt);
      if (monthKey) onboardedByMonth[monthKey] = (onboardedByMonth[monthKey] || 0) + 1;
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return {
    healthConcernCounts: Object.fromEntries(counts),
    onboardedByMonth,
    usersById,
    registeredTodayCount,
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
    eagleUsers,
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
    countAccountsByRoleKey("wellness_coach"),
    countAccountsByRoleKey("assistant_wellness_coach"),
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
    countUsersByClientCategory("eagle"),
    scanUserAnalytics(),
  ]);

  const {
    healthConcernCounts,
    onboardedByMonth,
    usersById = new Map(),
    registeredTodayCount = 0,
  } = userAnalytics;
  const payingClientCount = healUsers + consultancyUsers + maintenanceUsers;
  const coachIds = [
    ...(paidTransactions || []).map((row) => row.parentCoachId),
    ...[...usersById.values()].flatMap((user) => [
      user.parentCoachId,
      user.assignedCoachType === "wellness_coach" ? user.assignedCoachId : "",
    ]),
  ];
  const coachNames = await loadCoachNamesById(coachIds);
  const revenueAnalytics = buildRevenueAnalytics({
    paidTransactions,
    onboardedByMonth,
    payingClientCount,
    coachNames,
    usersById,
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

  const [teamRoles, subscriptionExpiry] = await Promise.all([
    buildTeamRoleCards({
      pendingUserAssignments,
      pendingCoachApprovals,
    }),
    getSubscriptionExpiryStats(),
  ]);

  return {
    totalUsers,
    eagleUsers,
    activePrograms,
    activeWellnessCoaches,
    activeAssistants,
    pendingApprovals: pendingCoachApprovals + pendingUserAssignments,
    pendingCoachApprovals,
    pendingUserAssignments,
    healthConcernCounts,
    subscriptionExpiry,
    registeredToday: {
      count: registeredTodayCount,
    },
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
    teamRoles,
  };
}

function monthDateBounds(monthKey) {
  const [year, month] = String(monthKey || "").split("-").map(Number);
  if (!year || !month) return null;
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

function normalizeDashboardPaymentBucket(value) {
  const key = String(value || "consultancy").trim().toLowerCase();
  return DASHBOARD_PAYMENT_BUCKETS[key] ? key : null;
}

async function loadDashboardPaymentContext(rows) {
  const userIds = [
    ...new Set(
      (rows || [])
        .map((row) => String(row.userId || row.userSnapshot?.id || "").trim())
        .filter(Boolean),
    ),
  ];
  const usersById = new Map();
  await Promise.all(
    userIds.map(async (id) => {
      try {
        const user = await getUserById(id);
        if (!user) return;
        usersById.set(id, {
          name: String(user.name || "").trim(),
          parentCoachId: String(user.parentCoachId || "").trim(),
          assignedCoachId: String(user.assignedCoachId || "").trim(),
          assignedCoachType: String(user.assignedCoachType || "").trim(),
          primaryHealthConcern: String(
            user.primaryHealthConcern?.id || user.primaryHealthConcern || "",
          ).trim(),
        });
      } catch {
        /* ignore missing users */
      }
    }),
  );
  const coachIds = [
    ...(rows || []).map((row) => row.parentCoachId),
    ...[...usersById.values()].flatMap((user) => [
      user.parentCoachId,
      user.assignedCoachType === "wellness_coach" ? user.assignedCoachId : "",
    ]),
  ];
  const coachNames = await loadCoachNamesById(coachIds);
  return { coachNames, usersById };
}

async function listDashboardPaymentsForBucketMonth(monthKey, productBucket) {
  const bucketKey = normalizeDashboardPaymentBucket(productBucket);
  const bucket = DASHBOARD_PAYMENT_BUCKETS[bucketKey];
  const bounds = monthDateBounds(monthKey);
  if (!bucket || !bounds) return [];

  const merged = [];
  let page = 1;
  let pages = 1;
  do {
    const chunk = await listAllTransactions({
      page,
      limit: 200,
      paymentStatus: "paid",
      productTypes: bucket.productTypes,
      fromDate: bounds.from,
      toDate: bounds.to,
    });
    merged.push(...(chunk.transactions || []));
    pages = chunk.pagination?.pages || 1;
    page += 1;
  } while (page <= pages);

  return merged
    .filter((row) => transactionMonthKey(row) === monthKey)
    .sort((a, b) => String(b.paidAt || b.createdAt || "").localeCompare(String(a.paidAt || a.createdAt || "")));
}

async function listDashboardPaymentsPaginated({
  monthKey,
  productBucket = "consultancy",
  page = 1,
  limit = 25,
  scopeCoachId = null,
  scopeClientIds = null,
} = {}) {
  const key = String(monthKey || "").trim();
  const bucketKey = normalizeDashboardPaymentBucket(productBucket);
  if (!/^\d{4}-\d{2}$/.test(key) || !bucketKey) {
    return {
      payments: [],
      pagination: { page: 1, limit, total: 0, pages: 1, hasMore: false },
      summary: { count: 0, totalAmount: 0 },
      type: productBucket,
      month: key,
    };
  }

  let monthRows = await listDashboardPaymentsForBucketMonth(key, bucketKey);
  const coachKey = String(scopeCoachId || "").trim();
  const hasScope = coachKey || (scopeClientIds instanceof Set && scopeClientIds.size);
  if (hasScope) {
    const { usersById } = await loadDashboardPaymentContext(monthRows);
    monthRows = monthRows.filter((row) =>
      transactionMatchesRevenueScope(row, {
        coachId: coachKey,
        clientIds: scopeClientIds,
        usersById,
      }),
    );
  }
  const paged = paginateItems(monthRows, page, limit, 200);
  const { coachNames, usersById } = await loadDashboardPaymentContext(paged.items);
  const payments = paged.items.map((row) => toPaymentRow(row, coachNames, usersById));
  const totalAmount = roundMoney(
    monthRows.reduce((sum, row) => sum + (Number(row.totalAmount) || 0), 0),
  );

  return {
    payments,
    pagination: {
      ...paged.pagination,
      hasMore: paged.pagination.page < paged.pagination.pages,
    },
    summary: {
      count: monthRows.length,
      totalAmount,
    },
    type: bucketKey,
    month: key,
  };
}

async function listDashboardPaymentsForMonth(monthKey) {
  const key = String(monthKey || "").trim();
  const paidTransactions = await listPaidTransactionsForAnalytics();
  const monthRows = (paidTransactions || []).filter((row) => transactionMonthKey(row) === key);
  const { coachNames, usersById } = await loadDashboardPaymentContext(monthRows);
  return monthRows
    .map((row) => toPaymentRow(row, coachNames, usersById))
    .sort((a, b) => String(b.paidAt || "").localeCompare(String(a.paidAt || "")));
}

function transactionMatchesRevenueScope(row, { coachId, clientIds, usersById } = {}) {
  const userId = String(row.userId || row.userSnapshot?.id || "").trim();
  const parentId = String(row.parentCoachId || "").trim();
  const coachKey = String(coachId || "").trim();

  if (coachKey && parentId === coachKey) return true;
  if (clientIds instanceof Set && userId && clientIds.has(userId)) return true;

  const user = usersById.get(userId);
  if (coachKey && user?.parentCoachId === coachKey) return true;
  if (clientIds instanceof Set && userId && clientIds.has(userId)) return true;
  return false;
}

function countPayingClients(clients) {
  return (clients || []).filter((user) => {
    const tier = normalizeUserTier(user?.userTier);
    return tier === "heal" || tier === "consultancy_only" || tier === "maintenance";
  }).length;
}

function buildClientAnalytics(clients, coachId) {
  const coachKey = String(coachId || "").trim();
  const usersById = new Map();
  const clientIds = new Set();
  const onboardedByMonth = {};

  for (const user of clients || []) {
    const id = String(user.id || "").trim();
    if (!id) continue;
    clientIds.add(id);
    usersById.set(id, {
      name: String(user.name || "").trim(),
      parentCoachId: String(user.parentCoachId || coachKey || "").trim(),
      assignedCoachId: String(user.assignedCoachId || "").trim(),
      assignedCoachType: String(user.assignedCoachType || "").trim(),
      primaryHealthConcern: String(user.primaryHealthConcern?.id || user.primaryHealthConcern || "").trim(),
    });
    const monthKey = monthKeyFromDate(user.createdAt);
    if (monthKey) onboardedByMonth[monthKey] = (onboardedByMonth[monthKey] || 0) + 1;
  }

  return { usersById, clientIds, onboardedByMonth, payingClientCount: countPayingClients(clients) };
}

/**
 * Revenue analytics scoped to a coach roster (optionally narrowed to assigned clients).
 */
async function buildScopedRevenueAnalytics({ coachId, restrictToUserIds } = {}) {
  const coachKey = String(coachId || "").trim();
  if (!coachKey) return null;

  const { users } = await listUsersByParentCoachId(coachKey, { userTier: "client", unpaginated: true });
  let clients = users || [];
  if (restrictToUserIds instanceof Set && restrictToUserIds.size) {
    clients = clients.filter((user) => restrictToUserIds.has(String(user.id || "").trim()));
  }

  const { usersById, clientIds, onboardedByMonth, payingClientCount } = buildClientAnalytics(clients, coachKey);
  const paidTransactions = await listPaidTransactionsForAnalytics();
  const scopedTransactions = (paidTransactions || []).filter((row) =>
    transactionMatchesRevenueScope(row, { coachId: coachKey, clientIds, usersById }),
  );
  const coachNames = await loadCoachNamesById([coachKey]);

  return buildRevenueAnalytics({
    paidTransactions: scopedTransactions,
    onboardedByMonth,
    payingClientCount,
    coachNames,
    usersById,
  });
}

function mergeRevenueIntoStatistics(statistics, revenueAnalytics) {
  if (!revenueAnalytics) return statistics;
  const currentFy = revenueAnalytics.financialYears.find(
    (fy) => fy.fyStartYear === revenueAnalytics.currentFyStartYear,
  );
  return {
    ...statistics,
    revenueAnalytics,
    revenueAndPayouts: revenueAnalytics.totalRevenue,
    charts: {
      ...(statistics.charts || {}),
      revenueByMonth: currentFy
        ? currentFy.months.map((row) => ({
            month: row.month,
            label: row.label,
            revenue: row.total,
            program: row.program,
            consultancy: row.consultancy,
            app: row.app,
          }))
        : statistics.charts?.revenueByMonth,
      revenueByProduct: revenueAnalytics.products,
    },
  };
}

function stripRevenueFromStatistics(statistics) {
  if (!statistics) return statistics;
  const next = { ...statistics };
  delete next.revenueAnalytics;
  delete next.revenueAndPayouts;
  delete next.consultancyRevenue;
  delete next.programRevenue;
  if (next.charts) {
    next.charts = { ...next.charts };
    delete next.charts.revenueByMonth;
    delete next.charts.revenueByProduct;
  }
  return next;
}

module.exports = {
  getAdminDashboardStats,
  buildRevenueAnalytics,
  buildScopedRevenueAnalytics,
  mergeRevenueIntoStatistics,
  stripRevenueFromStatistics,
  transactionMatchesRevenueScope,
  listDashboardPaymentsForMonth,
  listDashboardPaymentsPaginated,
  DASHBOARD_PAYMENT_BUCKETS,
  DASHBOARD_PAYMENT_BUCKET_ORDER,
};

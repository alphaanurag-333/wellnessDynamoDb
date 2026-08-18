const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { listScopedUsers } = require("./pendingTasksService");
const { getWellnessCoachById } = require("../models/wellnessCoachModel");
const {
  queryCoachRecommendedSupplementsByCoachId,
  scanCoachRecommendedSupplements,
} = require("../models/coachRecommendedSupplementModel");
const { TABLE: WEIGHT_TABLE } = require("../models/healthProgressWeightModel");
const { TABLE: BODY_TABLE } = require("../models/userBodyMeasurementModel");
const { TABLE: GLUCOSE_TABLE } = require("../models/healthProgressGlucoseModel");
const {
  toKg,
  toNumberOrNull,
  firstAndLastNumeric,
  isHealClientInOnboarding,
  buildOnboardingRow,
  classifyFatLoss,
  classifyHba1c,
  looksLikeA1cSeries,
  formatKg,
  formatA1c,
  formatChangeKg,
  formatChangePts,
  metricRow,
  daysAgo,
} = require("../utils/programProgressCalculations");

const AVATAR_COLORS = ["#34a56a", "#5e6ad2", "#0d9488", "#ec7a45", "#c2661d", "#7c8aa5", "#a855f7"];
const SCAN_LIMIT = 8000;

function userIdOf(row) {
  return String(row?.id || row?._id || "").trim();
}

function inUserSet(userId, allowedIds) {
  if (!allowedIds) return true;
  return allowedIds.has(String(userId || "").trim());
}

function avatarColor(seed) {
  const raw = String(seed || "");
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialsFromName(name) {
  return (
    String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function formatDaysAgoShort(value) {
  const days = daysAgo(value);
  if (days == null) return "recently";
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function formatPlacedDetail(iso) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return "Placed · in transit";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `Placed ${date.getDate()} ${months[date.getMonth()]} · in transit`;
}

async function safeScan(tableName, options) {
  try {
    return await scanTable(tableName, options);
  } catch (err) {
    console.warn(`[programProgress] scan ${tableName} failed:`, err?.message || err);
    return [];
  }
}

async function scanTable(tableName, { projection, exprNames } = {}) {
  const items = [];
  let lastKey;
  do {
    const params = { TableName: tableName };
    if (lastKey) params.ExclusiveStartKey = lastKey;
    if (projection) params.ProjectionExpression = projection;
    if (exprNames) params.ExpressionAttributeNames = exprNames;
    const { Items = [], LastEvaluatedKey } = await docClient.send(new ScanCommand(params));
    items.push(...Items);
    lastKey = LastEvaluatedKey;
  } while (lastKey && items.length < SCAN_LIMIT);
  return items;
}

function groupByUserId(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const userId = String(row?.userId || "").trim();
    if (!userId) continue;
    const list = map.get(userId);
    if (list) list.push(row);
    else map.set(userId, [row]);
  }
  return map;
}

async function loadCoachNames(users) {
  const ids = [
    ...new Set(
      (users || [])
        .map((user) => String(user.parentCoachId || "").trim())
        .filter(Boolean)
    ),
  ];
  const names = new Map();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const coach = await getWellnessCoachById(id);
        names.set(id, String(coach?.name || "").trim() || "Not assigned");
      } catch {
        names.set(id, "Not assigned");
      }
    })
  );
  return names;
}

function coachNameFor(user, coachNames) {
  const id = String(user?.parentCoachId || "").trim();
  if (!id) return "Not assigned";
  return coachNames.get(id) || "Not assigned";
}

function emptyBucket() {
  return { count: 0, rows: [] };
}

function buildOnboarding(users, coachNames) {
  const rows = [];
  for (const user of users || []) {
    if (!isHealClientInOnboarding(user)) continue;
    rows.push(buildOnboardingRow(user, coachNameFor(user, coachNames)));
  }
  return {
    count: rows.length,
    rows,
  };
}

function buildFatLoss(users, coachNames, weightByUser, bodyByUser) {
  const down610 = [];
  const halfway = [];
  const neartarget = [];

  for (const user of users || []) {
    const userId = userIdOf(user);
    if (!userId) continue;
    const weights = [
      ...(weightByUser.get(userId) || []),
      ...(bodyByUser.get(userId) || []),
    ];
    const readWeight = (row) => toKg(row.weightKg, row.weightUnit);
    const series = firstAndLastNumeric(weights, readWeight);
    if (series.start == null || series.current == null) continue;
    if (series.start === series.current && (weightByUser.get(userId) || []).length + (bodyByUser.get(userId) || []).length < 2) {
      continue;
    }

    const heightCm =
      toNumberOrNull(
        [...(bodyByUser.get(userId) || [])].reverse().find((row) => toNumberOrNull(row.heightCm))?.heightCm
      ) || null;
    const flags = classifyFatLoss({
      startKg: series.start,
      currentKg: series.current,
      heightCm,
    });
    if (!flags.down610 && !flags.halfway && !flags.neartarget) continue;

    const row = metricRow({
      user,
      coachName: coachNameFor(user, coachNames),
      start: formatKg(series.start),
      current: formatKg(series.current),
      change: formatChangeKg(flags.lost),
    });
    if (flags.down610) down610.push(row);
    if (flags.halfway) halfway.push(row);
    if (flags.neartarget) neartarget.push(row);
  }

  return {
    down610: { count: down610.length, rows: down610 },
    halfway: { count: halfway.length, rows: halfway },
    neartarget: { count: neartarget.length, rows: neartarget },
  };
}

function buildHba1c(users, coachNames, glucoseByUser) {
  const down2 = [];
  const under65 = [];

  for (const user of users || []) {
    const userId = userIdOf(user);
    if (!userId) continue;
    const logs = glucoseByUser.get(userId) || [];
    const values = logs.map((row) => toNumberOrNull(row.value)).filter((n) => n != null);
    if (!looksLikeA1cSeries(values)) continue;

    const series = firstAndLastNumeric(logs, (row) => toNumberOrNull(row.value));
    const flags = classifyHba1c({ start: series.start, current: series.current });
    if (!flags.down2 && !flags.under65) continue;

    const row = metricRow({
      user,
      coachName: coachNameFor(user, coachNames),
      start: formatA1c(series.start),
      current: formatA1c(series.current),
      change: formatChangePts(flags.drop),
    });
    if (flags.down2) down2.push(row);
    if (flags.under65) under65.push(row);
  }

  return {
    down2: { count: down2.length, rows: down2 },
    under65: { count: under65.length, rows: under65 },
  };
}

function toOverduePerson(user, extras = {}) {
  const name = String(user?.name || extras.name || "Client").trim() || "Client";
  const userId = userIdOf(user);
  return {
    userId,
    name,
    detail: extras.detail || "",
    initial: initialsFromName(name),
    color: extras.color || avatarColor(userId || name),
  };
}

function buildOpsOverdue(usersById, recommendations) {
  const orders = [];
  const delivery = [];

  for (const rec of recommendations || []) {
    const userId = String(rec.userId || "").trim();
    const user = usersById.get(userId);
    if (!user) continue;

    const requested = Boolean(rec.deliveryRequestedAt);
    const billed = Boolean(rec.billUploadedAt || rec.billPdfUrl || rec.billPdfKey);
    if (!requested && !billed) continue;

    if (requested && !billed) {
      orders.push(
        toOverduePerson(user, {
          detail: `Requested ${formatDaysAgoShort(rec.deliveryRequestedAt)}`,
        })
      );
    } else if (billed) {
      delivery.push(
        toOverduePerson(user, {
          detail: formatPlacedDetail(rec.billUploadedAt || rec.updatedAt),
        })
      );
    }
  }

  return {
    title: "Overdue",
    total: `${orders.length + delivery.length} pending`,
    cells: [
      {
        id: "orders",
        short: "Orders",
        count: orders.length,
        chip: "not placed",
        color: "#2b8f5b",
        tipTitle: "Orders not placed",
        people: orders,
      },
      {
        id: "delivery",
        short: "Delivery",
        count: delivery.length,
        chip: "not delivered",
        color: "#c0392b",
        tipTitle: "Delivery overdue",
        people: delivery,
      },
    ],
  };
}

async function loadSupplements(actor, allowedIds) {
  try {
    const coachId =
      actor.role === "wellness_coach"
        ? actor.id
        : actor.role === "assistant_wellness_coach" || actor.role === "trainee"
          ? actor.parentCoachId
          : null;

    const recs =
      actor.role === "admin" || actor.role === "support"
        ? await scanCoachRecommendedSupplements({ limit: 800 })
        : coachId
          ? await queryCoachRecommendedSupplementsByCoachId(coachId)
          : [];

    return (recs || []).filter((row) => inUserSet(row.userId, allowedIds));
  } catch (err) {
    console.warn("[programProgress] supplements failed:", err?.message || err);
    return [];
  }
}

async function getProgramProgressOverview(actor) {
  const users = await listScopedUsers(actor);
  const usersById = new Map(users.map((user) => [userIdOf(user), user]).filter(([id]) => id));
  const allowedIds = actor.role === "admin" || actor.role === "support" ? null : new Set(usersById.keys());

  const [coachNames, weightRows, bodyRows, glucoseRows, supplements] = await Promise.all([
    loadCoachNames(users),
    safeScan(WEIGHT_TABLE, { projection: "userId, weightKg, recordedAt, createdAt" }),
    safeScan(BODY_TABLE, {
      projection: "userId, weightKg, weightUnit, heightCm, recordedAt, createdAt",
    }),
    safeScan(GLUCOSE_TABLE, {
      projection: "userId, #gtype, #gvalue, recordedAt, createdAt",
      exprNames: { "#gtype": "type", "#gvalue": "value" },
    }),
    loadSupplements(actor, allowedIds),
  ]);

  const filterRows = (rows) =>
    (rows || []).filter((row) => inUserSet(row.userId, allowedIds));

  const fatLoss = buildFatLoss(
    users,
    coachNames,
    groupByUserId(filterRows(weightRows)),
    groupByUserId(filterRows(bodyRows))
  );
  const hba1c = buildHba1c(users, coachNames, groupByUserId(filterRows(glucoseRows)));

  return {
    programProgress: {
      onboarding: buildOnboarding(users, coachNames),
      fatLoss,
      hba1c,
    },
    opsOverdue: buildOpsOverdue(usersById, supplements),
  };
}

module.exports = {
  getProgramProgressOverview,
};

const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { listScopedUsers } = require("./pendingTasksService");
const { getWellnessCoachById } = require("../models/wellnessCoachModel");
const { listOnboardingMeetingsByCoachId } = require("../models/onboardingMeetingModel");
const { normalizeUserTier } = require("../models/userAssignmentLogic");
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
const LAB_TABLE = "UserLabReport";
const BLOOD_STALE_DAYS = 180;
const RECORD_TIERS = new Set(["heal", "maintenance", "consultancy_only"]);
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STEP_LABELS = {
  launch: "LAUNCH review",
  hap: "HAP session",
  reportsBriefing: "Reports briefing",
  programInitiation: "Program initiation",
};

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
    const fulfilmentOrders = Array.isArray(rec.fulfilmentOrders) ? rec.fulfilmentOrders : [];
    const hasLoggedOrder = fulfilmentOrders.length > 0;
    const selfBilled = Boolean(rec.billUploadedAt || rec.billPdfUrl || rec.billPdfKey);
    if (!requested && !hasLoggedOrder && !selfBilled) continue;

    if (requested && !hasLoggedOrder && !selfBilled) {
      orders.push(
        toOverduePerson(user, {
          detail: `Requested ${formatDaysAgoShort(rec.deliveryRequestedAt)}`,
        })
      );
    } else if (hasLoggedOrder || selfBilled) {
      const latestOrder = fulfilmentOrders[fulfilmentOrders.length - 1];
      delivery.push(
        toOverduePerson(user, {
          detail: formatPlacedDetail(
            latestOrder?.billUploadedAt ||
              latestOrder?.updatedAt ||
              latestOrder?.placedOn ||
              rec.billUploadedAt ||
              rec.updatedAt
          ),
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

function startOfWeek(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function endOfWeek(start) {
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

function meetingStartIso(meeting) {
  if (!meeting) return "";
  if (meeting.status === "time_requested") return meeting.requestedStartAt || "";
  const slot =
    (meeting.slots || []).find((item) => item.id === meeting.selectedSlotId) ||
    (meeting.slots || [])[0];
  return slot?.startAt || meeting.confirmedAt || "";
}

function formatMeetingDetail(startAt, stepKey) {
  const date = startAt ? new Date(startAt) : null;
  const kind = STEP_LABELS[stepKey] || String(stepKey || "Meeting").replace(/_/g, " ");
  if (!date || Number.isNaN(date.getTime())) return kind;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${DOW[date.getDay()]} ${hours}:${minutes} · ${kind}`;
}

function buildSchedule(usersById, meetings) {
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek(weekStart);
  const people = [];

  for (const meeting of meetings || []) {
    if (!["confirmed", "slots_offered"].includes(String(meeting.status || ""))) continue;
    const startIso = meetingStartIso(meeting);
    const start = startIso ? new Date(startIso) : null;
    if (!start || Number.isNaN(start.getTime()) || start < weekStart || start >= weekEnd) continue;
    const userId = String(meeting.userId || "").trim();
    const user = usersById.get(userId) || { id: userId, name: meeting.userName || "Client" };
    people.push(
      toOverduePerson(user, {
        name: user.name || meeting.userName,
        detail: formatMeetingDetail(startIso, meeting.stepKey),
      })
    );
  }

  people.sort((a, b) => String(a.detail).localeCompare(String(b.detail)));

  return {
    title: "Schedule",
    total: `${people.length} pending`,
    cells: [
      {
        id: "meetings",
        short: "Meetings",
        count: people.length,
        chip: "scheduled",
        color: "#5e6ad2",
        tipTitle: "Upcoming meetings",
        people: people.slice(0, 8),
      },
    ],
  };
}

function latestReportIso(rows) {
  let latest = 0;
  for (const row of rows || []) {
    if (!row?.fileKey && !row?.fileUrl) continue;
    const date = new Date(row.reportDate || row.createdAt || 0);
    if (Number.isNaN(date.getTime())) continue;
    latest = Math.max(latest, date.getTime());
  }
  return latest || null;
}

function buildStaleRecords(users, labReports) {
  const reportsByUser = groupByUserId(labReports);
  const bloodPeople = [];

  for (const user of users || []) {
    const userId = userIdOf(user);
    if (!userId) continue;
    if (!RECORD_TIERS.has(normalizeUserTier(user?.userTier))) continue;

    const latest = latestReportIso(reportsByUser.get(userId) || []);
    const reference = latest || new Date(user.healPaidAt || user.createdAt || 0).getTime();
    if (!reference || Number.isNaN(reference)) continue;
    const ageDays = Math.floor((Date.now() - reference) / 86400000);
    if (ageDays < BLOOD_STALE_DAYS) continue;

    bloodPeople.push(
      toOverduePerson(user, {
        detail: latest ? `${ageDays}d since last test` : "No blood test on file",
      })
    );
  }

  const gutCount = 0;
  const items = [
    {
      id: "blood-test",
      label: "Blood test",
      count: bloodPeople.length,
      note: "Older than 6 months",
      color: "#0d9488",
    },
    {
      id: "gut-reset",
      label: "Gut reset",
      count: gutCount,
      note: "No reset in 60 days",
      color: "#a855f7",
    },
  ];

  return {
    total: `${bloodPeople.length + gutCount} due`,
    items,
  };
}

async function loadMeetings(actor, allowedIds) {
  try {
    const coachId =
      actor.role === "wellness_coach"
        ? actor.id
        : actor.role === "assistant_wellness_coach" || actor.role === "trainee"
          ? actor.parentCoachId
          : null;

    const coachIds = coachId
      ? [coachId]
      : [];

    if (!coachIds.length && (actor.role === "admin" || actor.role === "support")) {
      return [];
    }

    const lists = await Promise.all(
      coachIds.map((id) =>
        listOnboardingMeetingsByCoachId(id, { page: 1, limit: 400 }).catch(() => ({ items: [] }))
      )
    );
    return lists
      .flatMap((data) => data?.items || [])
      .filter((row) => inUserSet(row.userId, allowedIds));
  } catch (err) {
    console.warn("[programProgress] meetings failed:", err?.message || err);
    return [];
  }
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

  const [coachNames, weightRows, bodyRows, glucoseRows, supplements, meetings, labReports] = await Promise.all([
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
    loadMeetings(actor, allowedIds),
    safeScan(LAB_TABLE, { projection: "userId, reportDate, createdAt, fileKey" }),
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
    schedule: buildSchedule(usersById, meetings),
    staleRecords: buildStaleRecords(users, filterRows(labReports)),
  };
}

module.exports = {
  getProgramProgressOverview,
};

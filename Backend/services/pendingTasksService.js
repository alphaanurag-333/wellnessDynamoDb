const {
  listUsers,
  listUsersByParentCoachId,
  listUsersByAssignedCoachId,
} = require("../models/userModel");
const { queryMealLogsByCoachId, queryPendingMealLogs, toMealLogPublic } = require("../models/mealTrackingModel");
const { queryPendingLabReports } = require("../models/userLabReportModel");
const {
  queryCoachRecommendedSupplementsByCoachId,
  scanCoachRecommendedSupplements,
} = require("../models/coachRecommendedSupplementModel");
const { listOnboardingMeetingsByCoachId } = require("../models/onboardingMeetingModel");
const { normalizeUserTier } = require("../models/userAssignmentLogic");

const AVATAR_COLORS = ["#34a56a", "#5e6ad2", "#0d9488", "#ec7a45", "#c2661d", "#7c8aa5"];
const COUNSELLING_OVERDUE_DAYS = 14;
const COUNSELLING_TIERS = new Set(["heal", "maintenance", "consultancy_only"]);
const COUNSELLING_STEPS = new Set(["launch", "hap", "reportsBriefing", "programInitiation"]);
const STEP_LABELS = {
  launch: "LAUNCH review",
  hap: "HAP session",
  reportsBriefing: "Reports briefing",
  programInitiation: "Program initiation",
};
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function userIdOf(row) {
  return String(row?.id || row?._id || "").trim();
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

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysAgo(value) {
  const date = parseDate(value);
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function formatDaysAgo(value) {
  const days = daysAgo(value);
  if (days == null) return "";
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function formatLoggedWhen(value) {
  const days = daysAgo(value);
  if (days == null) return "recently";
  if (days <= 0) return "logged today";
  if (days === 1) return "logged yesterday";
  return `logged ${days} days ago`;
}

function formatMeetingDetail(startAt, stepKey) {
  const date = parseDate(startAt);
  const kind = STEP_LABELS[stepKey] || String(stepKey || "Meeting").replace(/_/g, " ");
  if (!date) return kind;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${DOW[date.getDay()]} ${hours}:${minutes} · ${kind}`;
}

function formatPlacedDetail(iso) {
  const date = parseDate(iso);
  if (!date) return "Placed · in transit";
  return `Placed ${date.getDate()} ${MONTHS[date.getMonth()]} · in transit`;
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

function toTaskItem(user, extras = {}) {
  const userId = userIdOf(user);
  const name = String(user?.name || extras.name || "Client").trim() || "Client";
  return {
    id: extras.id || userId,
    userId,
    name,
    initials: initialsFromName(name),
    color: extras.color || avatarColor(userId || name),
    tag: extras.tag || "",
    detail: extras.detail || "",
    link: extras.link || "Open",
    section: extras.section || "glance",
  };
}

async function listScopedUsers(actor) {
  if (actor.role === "admin") {
    const data = await listUsers({ page: 1, limit: 10000, status: "active" });
    return data.users || [];
  }
  if (actor.role === "wellness_coach") {
    const data = await listUsersByParentCoachId(actor.id, {
      unpaginated: true,
      userTier: "all",
    });
    return data.users || [];
  }
  if (actor.role === "assistant_wellness_coach") {
    if (!actor.parentCoachId) return [];
    const data = await listUsersByAssignedCoachId(actor.id, {
      parentCoachId: actor.parentCoachId,
      unpaginated: true,
      userTier: "all",
    });
    return data.users || [];
  }
  if (actor.role === "trainee") {
    if (!actor.parentCoachId) return [];
    const data = await listUsersByParentCoachId(actor.parentCoachId, {
      unpaginated: true,
      userTier: "all",
    });
    return data.users || [];
  }
  return [];
}

function userMapFrom(users) {
  const map = new Map();
  for (const user of users || []) {
    const id = userIdOf(user);
    if (id) map.set(id, user);
  }
  return map;
}

function inUserSet(userId, allowedIds) {
  if (!allowedIds) return true;
  return allowedIds.has(String(userId || "").trim());
}

function lastCounsellingAt(meetings) {
  let latest = 0;
  for (const meeting of meetings || []) {
    if (meeting.status !== "confirmed") continue;
    if (!COUNSELLING_STEPS.has(String(meeting.stepKey || ""))) continue;
    const start = parseDate(meetingStartIso(meeting));
    if (!start) continue;
    latest = Math.max(latest, start.getTime());
  }
  return latest || null;
}

function counsellingItems(users, meetingsByUser) {
  const items = [];
  for (const user of users || []) {
    const id = userIdOf(user);
    if (!id) continue;
    const tier = normalizeUserTier(user?.userTier);
    if (!COUNSELLING_TIERS.has(tier)) continue;

    const lastAt = lastCounsellingAt(meetingsByUser.get(id) || []);
    const referenceIso = lastAt
      ? new Date(lastAt).toISOString()
      : (user.healPaidAt || user.createdAt);
    const days = daysAgo(referenceIso);
    if (days == null || days < COUNSELLING_OVERDUE_DAYS) continue;

    items.push(
      toTaskItem(user, {
        id: `counselling-${id}`,
        tag: "COUNSELLING",
        detail: `Last session ${formatDaysAgo(referenceIso)}`,
        link: "Schedule",
        section: "glance",
      })
    );
  }
  items.sort((a, b) => String(b.detail).localeCompare(String(a.detail)));
  return items;
}

function bloodReportItems(usersById, reports) {
  const byUser = new Map();
  for (const report of reports || []) {
    const userId = String(report.userId || "").trim();
    const uploaded = Boolean(report.fileKey || report.fileUrl);
    if (!userId || !uploaded) continue;
    if (String(report.reviewStatus || "").toLowerCase() === "reviewed") continue;
    if (!byUser.has(userId)) byUser.set(userId, []);
    byUser.get(userId).push(report);
  }

  const items = [];
  for (const [userId, rows] of byUser.entries()) {
    const user = usersById.get(userId) || { id: userId, name: "Client" };
    const latest = [...rows].sort((a, b) =>
      String(b.createdAt || b.reportDate || "").localeCompare(String(a.createdAt || a.reportDate || ""))
    )[0];
    const uploaded = formatDaysAgo(latest?.createdAt || latest?.reportDate);
    items.push(
      toTaskItem(user, {
        id: `report-${latest?.id || userId}`,
        tag: "BLOOD REPORT",
        detail: uploaded ? `Report uploaded ${uploaded}` : "Report uploaded · analysis due",
        link: "Analyse",
        section: "internal",
      })
    );
  }
  return items;
}

function mealReviewItems(usersById, logs) {
  const byUser = new Map();
  for (const log of logs || []) {
    const userId = String(log.userId || "").trim();
    if (!userId) continue;
    if (!byUser.has(userId)) byUser.set(userId, []);
    byUser.get(userId).push(log);
  }

  const items = [];
  for (const [userId, rows] of byUser.entries()) {
    const user = usersById.get(userId) || { id: userId, name: rows[0]?.userName || "Client" };
    const photos = rows.filter((row) => row.photoUrl || row.photoKey).length;
    const latest = [...rows].sort((a, b) =>
      String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || ""))
    )[0];
    const countLabel = photos > 0
      ? `${photos} photo${photos === 1 ? "" : "s"}`
      : `${rows.length} log${rows.length === 1 ? "" : "s"}`;
    items.push(
      toTaskItem(user, {
        id: `meal-${userId}`,
        name: user.name || rows[0]?.userName,
        tag: "MEAL PICS",
        detail: `${countLabel} · ${formatLoggedWhen(latest?.createdAt || latest?.date)}`,
        link: "Review",
        section: "food",
      })
    );
  }
  return items;
}

function orderItems(usersById, recommendations) {
  const items = [];
  for (const rec of recommendations || []) {
    const userId = String(rec.userId || "").trim();
    const user = usersById.get(userId) || { id: userId, name: "Client" };
    if (!userId) continue;

    const requested = Boolean(rec.deliveryRequestedAt);
    const billed = Boolean(rec.billUploadedAt || rec.billPdfUrl || rec.billPdfKey);
    if (!requested && !billed) continue;

    if (requested && !billed) {
      items.push(
        toTaskItem(user, {
          id: `order-place-${rec.id}`,
          tag: "NOT PLACED",
          detail: `Client asked you to order · ${formatDaysAgo(rec.deliveryRequestedAt) || "recently"}`,
          link: "Place order",
          section: "nutritions",
        })
      );
    } else if (billed) {
      items.push(
        toTaskItem(user, {
          id: `order-deliver-${rec.id}`,
          tag: "NOT DELIVERED",
          detail: formatPlacedDetail(rec.billUploadedAt || rec.updatedAt),
          link: "Update log",
          section: "nutritions",
        })
      );
    }
  }
  return items;
}

function meetingItems(usersById, meetings) {
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek(weekStart);
  const items = [];

  for (const meeting of meetings || []) {
    if (!["confirmed", "slots_offered"].includes(String(meeting.status || ""))) continue;
    const startIso = meetingStartIso(meeting);
    const start = parseDate(startIso);
    if (!start || start < weekStart || start >= weekEnd) continue;
    const userId = String(meeting.userId || "").trim();
    const user = usersById.get(userId) || {
      id: userId,
      name: meeting.userName || "Client",
    };
    const tag = DOW[start.getDay()].toUpperCase();
    items.push(
      toTaskItem(user, {
        id: `meeting-${meeting.id}`,
        name: user.name || meeting.userName,
        tag,
        detail: formatMeetingDetail(startIso, meeting.stepKey),
        link: "Details",
        section: "launch",
      })
    );
  }

  items.sort((a, b) => String(a.detail).localeCompare(String(b.detail)));
  return items;
}

function safe(promise, fallback) {
  return promise.then((value) => value).catch((err) => {
    console.error("Pending tasks source failed:", err?.message || err);
    return fallback;
  });
}

async function getPendingTasks(actor) {
  const users = await listScopedUsers(actor);
  const usersById = userMapFrom(users);
  const allowedIds = actor.role === "admin" ? null : new Set(usersById.keys());
  const coachId =
    actor.role === "wellness_coach"
      ? actor.id
      : actor.role === "assistant_wellness_coach" || actor.role === "trainee"
        ? actor.parentCoachId
        : null;

  const coachIdsForMeetings = coachId
    ? [coachId]
    : [...new Set((users || []).map((user) => String(user.parentCoachId || "").trim()).filter(Boolean))];

  const [mealRaw, labReports, supplements, meetingLists] = await Promise.all([
    actor.role === "admin"
      ? safe(queryPendingMealLogs({ limit: 400 }), [])
      : coachId
        ? safe(queryMealLogsByCoachId(coachId, { status: "pending_review" }), [])
        : [],
    safe(queryPendingLabReports({ limit: 400 }), []),
    actor.role === "admin"
      ? safe(scanCoachRecommendedSupplements({ limit: 500 }), [])
      : coachId
        ? safe(queryCoachRecommendedSupplementsByCoachId(coachId), [])
        : [],
    Promise.all(
      coachIdsForMeetings.map((id) =>
        safe(listOnboardingMeetingsByCoachId(id, { page: 1, limit: 400 }), { items: [] })
      )
    ),
  ]);

  let mealLogs = (mealRaw || []).map((row) => toMealLogPublic(row)).filter(Boolean);
  if (actor.role === "assistant_wellness_coach") {
    mealLogs = mealLogs.filter(
      (log) =>
        String(log.assignedCoachType || "") === "assistant_wellness_coach" &&
        String(log.assignedCoachId || "") === String(actor.id)
    );
  }
  mealLogs = mealLogs.filter((log) => inUserSet(log.userId, allowedIds));

  const reports = (labReports || []).filter((row) => inUserSet(row.userId, allowedIds));
  const recs = (supplements || []).filter((row) => inUserSet(row.userId, allowedIds));
  const meetings = meetingLists
    .flatMap((data) => data?.items || [])
    .filter((row) => inUserSet(row.userId, allowedIds));

  const meetingsByUser = new Map();
  for (const meeting of meetings) {
    const userId = String(meeting.userId || "").trim();
    if (!userId) continue;
    if (!meetingsByUser.has(userId)) meetingsByUser.set(userId, []);
    meetingsByUser.get(userId).push(meeting);
  }

  const counsellingReports = [
    ...counsellingItems(users, meetingsByUser),
    ...bloodReportItems(usersById, reports),
  ];

  return {
    counsellingReports,
    mealReview: mealReviewItems(usersById, mealLogs),
    orders: orderItems(usersById, recs),
    meetings: meetingItems(usersById, meetings),
  };
}

module.exports = {
  getPendingTasks,
  listScopedUsers,
};

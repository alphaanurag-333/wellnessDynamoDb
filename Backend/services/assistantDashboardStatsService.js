const {
  getAssistantWellnessCoachByIdResolved,
  getWellnessCoachByIdResolved,
} = require("./accountResolver");
const { listUsersByAssignedCoachId, toPublicUser } = require("../models/userModel");
const { queryMealLogsByCoachId } = require("../models/mealTrackingModel");
const { listUserCommitmentLetters } = require("../models/userCommitmentLetterModel");
const { listClientTestimonials } = require("../models/clientTestimonials");
const { normalizeUserTier } = require("../models/userAssignmentLogic");
const { getSubscriptionExpiryStats } = require("./subscriptionExpiryStats");

const RECENT_LIMIT = 5;
const IST_TZ = "Asia/Kolkata";

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

function countRegisteredToday(clients) {
  const todayKey = dayKeyFromDate(new Date());
  if (!todayKey) return 0;
  let count = 0;
  for (const user of clients || []) {
    if (dayKeyFromDate(user.createdAt) === todayKey) count += 1;
  }
  return count;
}

function sortByRecent(items) {
  return [...(items || [])].sort((a, b) => {
    const aTime = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
    const bTime = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
    return bTime - aTime;
  });
}

function takeRecent(items, limit = RECENT_LIMIT) {
  return sortByRecent(items).slice(0, limit);
}

function filterForAssistant(rows, assistantId) {
  return (rows || []).filter(
    (row) =>
      String(row.assignedCoachType || "") === "assistant_wellness_coach" &&
      String(row.assignedCoachId || "") === String(assistantId)
  );
}

function countClientsByTier(users) {
  const counts = {
    seek: 0,
    consultancy_only: 0,
    heal: 0,
    maintenance: 0,
  };

  for (const user of users) {
    const tier = normalizeUserTier(user?.userTier);
    if (Object.hasOwn(counts, tier)) counts[tier] += 1;
  }

  return counts;
}

function countClientsByHealthConcern(users) {
  const counts = new Map();
  for (const user of users) {
    const concernId = String(user?.primaryHealthConcern || "").trim();
    if (concernId) counts.set(concernId, (counts.get(concernId) || 0) + 1);
  }
  return Object.fromEntries(counts);
}

function toDashboardClient(user) {
  const pub = toPublicUser(user);
  if (!pub) return null;
  return {
    id: pub.id,
    _id: pub.id,
    name: pub.name,
    email: pub.email,
    phone: pub.phone,
    phoneCountryCode: pub.phoneCountryCode,
    profileImage: pub.profileImage,
    userTier: pub.userTier,
    createdAt: pub.createdAt,
  };
}

async function getAssistantDashboardStats(assistantId) {
  const assistant = await getAssistantWellnessCoachByIdResolved(assistantId);
  if (!assistant) {
    throw new Error("Assistant account not found");
  }

  const parentCoachId = String(assistant.wellnessCoachId || "").trim();
  if (!parentCoachId) {
    throw new Error("Assistant is not linked to a wellness coach");
  }

  const [clientData, mealLogs, commitmentData, testimonialData] = await Promise.all([
    listUsersByAssignedCoachId(assistantId, {
      parentCoachId,
      userTier: "client",
      unpaginated: true,
    }),
    queryMealLogsByCoachId(parentCoachId, { status: "pending_review" }),
    listUserCommitmentLetters({
      page: 1,
      limit: 100,
      approvalStatus: "pending",
      managedByCoachId: parentCoachId,
    }),
    listClientTestimonials({
      page: 1,
      limit: 100,
      status: "inactive",
      managedByCoachId: parentCoachId,
    }),
  ]);

  const clients = clientData.users || [];
  const tierCounts = countClientsByTier(clients);
  const healClients = tierCounts.heal;
  const consultancyClients = tierCounts.consultancy_only;
  const healthConcernCounts = countClientsByHealthConcern(clients);
  const registeredToday = { count: countRegisteredToday(clients) };
  const totalClients = clientData.pagination?.total ?? clients.length;

  const pendingMealApprovals = filterForAssistant(mealLogs, assistantId).length;
  const pendingCommitmentLetters = filterForAssistant(
    commitmentData.commitmentLetters,
    assistantId
  ).length;
  const pendingTestimonials = filterForAssistant(
    testimonialData.clientTestimonials,
    assistantId
  ).length;
  const pendingApprovals =
    pendingMealApprovals + pendingCommitmentLetters + pendingTestimonials;

  const recentClients = takeRecent(clients).map(toDashboardClient).filter(Boolean);
  const subscriptionExpiry = await getSubscriptionExpiryStats({
    userIds: clients.map((user) => user.id).filter(Boolean),
  });

  const parentCoach = await getWellnessCoachByIdResolved(parentCoachId);
  const assistantProfile = {
    ...assistant,
    wellnessCoachName: parentCoach?.name || null,
  };

  const charts = {
    clientOverview: [
      { name: "Heal clients", value: healClients, color: "#10b981" },
      { name: "Consultancy clients", value: consultancyClients, color: "#2563eb" },
    ],
    pendingApprovals: [
      { key: "meals", name: "Meal logs", value: pendingMealApprovals, color: "#f59e0b" },
      { key: "testimonials", name: "Client reviews", value: pendingTestimonials, color: "#a855f7" },
      {
        key: "commitment_letters",
        name: "Commitment letters",
        value: pendingCommitmentLetters,
        color: "#6366f1",
      },
    ],
    clientTiers: [
      { key: "seek", name: "Seek (free)", value: tierCounts.seek },
      { key: "consultancy_only", name: "Consultancy only", value: tierCounts.consultancy_only },
      { key: "heal", name: "Heal (paid)", value: tierCounts.heal },
      { key: "maintenance", name: "Maintenance", value: tierCounts.maintenance },
    ],
  };

  return {
    totalClients,
    healClients,
    consultancyClients,
    healthConcernCounts,
    subscriptionExpiry,
    registeredToday,
    pendingApprovals,
    pendingMealApprovals,
    pendingTestimonials,
    pendingCommitmentLetters,
    charts,
    recentClients,
    assistant: {
      id: assistantProfile.id,
      name: assistantProfile.name,
      email: assistantProfile.email,
      status: assistantProfile.status,
      profileImage: assistantProfile.profileImage,
      wellnessCoachId: parentCoachId,
      wellnessCoachName: assistantProfile.wellnessCoachName || null,
    },
  };
}

module.exports = {
  getAssistantDashboardStats,
};

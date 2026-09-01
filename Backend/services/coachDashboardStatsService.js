const {
  toPublicWellnessCoach,
} = require("../models/wellnessCoachModel");
const { getWellnessCoachByIdResolved } = require("./accountResolver");
const {
  listAssistantsByWellnessCoachId,
  countAssistantsByWellnessCoachId,
  toPublicAssistant,
} = require("../models/assistantWellnessCoachModel");
const { listUsersByParentCoachId, toPublicUser } = require("../models/userModel");
const { queryMealLogsByCoachId } = require("../models/mealTrackingModel");
const { listUserCommitmentLetters } = require("../models/userCommitmentLetterModel");
const { listClientTestimonials } = require("../models/clientTestimonials");
const { normalizeUserTier, isEagleClientCategory } = require("../models/userAssignmentLogic");
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

function healthConcernIdOf(user) {
  const raw = user?.primaryHealthConcern;
  if (raw && typeof raw === "object") {
    return String(raw.id || raw._id || "").trim();
  }
  return String(raw || "").trim();
}

function countClientsByHealthConcern(users) {
  const counts = new Map();
  for (const user of users) {
    const concernId = healthConcernIdOf(user);
    if (concernId) counts.set(concernId, (counts.get(concernId) || 0) + 1);
  }
  return Object.fromEntries(counts);
}

function countActiveAssistants(assistants) {
  return (assistants || []).filter(
    (row) => String(row.status || "active").toLowerCase() === "active"
  ).length;
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

function toDashboardAssistant(assistant) {
  const pub = toPublicAssistant(assistant);
  if (!pub) return null;
  return {
    id: pub.id,
    _id: pub.id,
    name: pub.name,
    email: pub.email,
    phone: pub.phone,
    phoneCountryCode: pub.phoneCountryCode,
    profileImage: pub.profileImage,
    status: pub.status,
    designation: pub.designation,
    createdAt: pub.createdAt,
  };
}

async function getCoachDashboardStats(coachId) {
  const coach = await getWellnessCoachByIdResolved(coachId);
  if (!coach) {
    throw new Error("Coach account not found");
  }

  const [
    clientData,
    assistantData,
    totalAssistants,
    mealLogs,
    commitmentData,
    testimonialData,
  ] = await Promise.all([
    listUsersByParentCoachId(coachId, { userTier: "client", unpaginated: true }),
    listAssistantsByWellnessCoachId(coachId, { page: 1, limit: 200 }),
    countAssistantsByWellnessCoachId(coachId),
    queryMealLogsByCoachId(coachId, { status: "pending_review" }),
    listUserCommitmentLetters({
      page: 1,
      limit: 100,
      approvalStatus: "pending",
      managedByCoachId: coachId,
    }),
    listClientTestimonials({
      page: 1,
      limit: 100,
      status: "inactive",
      managedByCoachId: coachId,
    }),
  ]);

  const clients = clientData.users || [];
  const assistants = assistantData.assistants || [];
  const tierCounts = countClientsByTier(clients);
  const eagleUsers = clients.filter((user) => isEagleClientCategory(user?.clientCategory)).length;
  const healClients = tierCounts.heal;
  const consultancyClients = tierCounts.consultancy_only;
  const healthConcernCounts = countClientsByHealthConcern(clients);
  const registeredToday = { count: countRegisteredToday(clients) };
  const totalClients = clientData.pagination?.total ?? clients.length;
  const activeAssistants = countActiveAssistants(assistants);
  const inactiveAssistants = Math.max(0, totalAssistants - activeAssistants);

  const pendingMealApprovals = (mealLogs || []).length;
  const pendingCommitmentLetters = (commitmentData.commitmentLetters || []).length;
  const pendingTestimonials = (testimonialData.clientTestimonials || []).length;
  const pendingApprovals =
    pendingMealApprovals + pendingCommitmentLetters + pendingTestimonials;

  const recentClients = takeRecent(clients).map(toDashboardClient).filter(Boolean);
  const recentAssistants = takeRecent(assistants).map(toDashboardAssistant).filter(Boolean);
  const coachProfile = toPublicWellnessCoach(coach);
  const subscriptionExpiry = await getSubscriptionExpiryStats({
    userIds: clients.map((user) => user.id).filter(Boolean),
  });

  const charts = {
    teamOverview: [
      { name: "Active assistants", value: activeAssistants, color: "#10b981" },
      { name: "Inactive assistants", value: inactiveAssistants, color: "#94a3b8" },
    ],
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
    eagleUsers,
    healClients,
    consultancyClients,
    healthConcernCounts,
    subscriptionExpiry,
    registeredToday,
    totalAssistants,
    activeAssistants,
    pendingApprovals,
    pendingMealApprovals,
    pendingTestimonials,
    pendingCommitmentLetters,
    charts,
    recentClients,
    recentAssistants,
    coach: {
      id: coachProfile.id,
      name: coachProfile.name,
      email: coachProfile.email,
      status: coachProfile.status,
      profileImage: coachProfile.profileImage,
      city: coachProfile.city,
      state: coachProfile.state,
      country: coachProfile.country,
    },
  };
}

module.exports = {
  getCoachDashboardStats,
};

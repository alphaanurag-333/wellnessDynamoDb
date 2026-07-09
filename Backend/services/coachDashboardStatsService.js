const {
  getWellnessCoachById,
  toPublicWellnessCoach,
} = require("../models/wellnessCoachModel");
const {
  listAssistantsByWellnessCoachId,
  countAssistantsByWellnessCoachId,
  toPublicAssistant,
} = require("../models/assistantWellnessCoachModel");
const { listUsersByParentCoachId, toPublicUser } = require("../models/userModel");
const { queryMealLogsByCoachId } = require("../models/mealTrackingModel");
const { listUserCommitmentLetters } = require("../models/userCommitmentLetterModel");
const { listRealPeopleTestimonials } = require("../models/realPeopleTestimonialModel");
const { normalizeUserTier } = require("../models/userAssignmentLogic");

const RECENT_LIMIT = 5;

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
  let healClients = 0;
  let consultancyClients = 0;

  for (const user of users) {
    const tier = normalizeUserTier(user?.userTier);
    if (tier === "heal") healClients += 1;
    else if (tier === "consultancy_only") consultancyClients += 1;
  }

  return { healClients, consultancyClients };
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
  const coach = await getWellnessCoachById(coachId);
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
    listUsersByParentCoachId(coachId, { page: 1, limit: 200, userTier: "client" }),
    listAssistantsByWellnessCoachId(coachId, { page: 1, limit: 200 }),
    countAssistantsByWellnessCoachId(coachId),
    queryMealLogsByCoachId(coachId, { status: "pending_review" }),
    listUserCommitmentLetters({
      page: 1,
      limit: 100,
      approvalStatus: "pending",
      managedByCoachId: coachId,
    }),
    listRealPeopleTestimonials({
      page: 1,
      limit: 100,
      approvalStatus: "pending",
      managedByCoachId: coachId,
    }),
  ]);

  const clients = clientData.users || [];
  const assistants = assistantData.assistants || [];
  const { healClients, consultancyClients } = countClientsByTier(clients);
  const totalClients = clientData.pagination?.total ?? clients.length;
  const activeAssistants = countActiveAssistants(assistants);
  const inactiveAssistants = Math.max(0, totalAssistants - activeAssistants);

  const pendingMealApprovals = (mealLogs || []).length;
  const pendingCommitmentLetters = (commitmentData.commitmentLetters || []).length;
  const pendingTestimonials = (testimonialData.realPeopleTestimonials || []).length;
  const pendingApprovals =
    pendingMealApprovals + pendingCommitmentLetters + pendingTestimonials;

  const recentClients = takeRecent(clients).map(toDashboardClient).filter(Boolean);
  const recentAssistants = takeRecent(assistants).map(toDashboardAssistant).filter(Boolean);
  const coachProfile = toPublicWellnessCoach(coach);

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
      { key: "testimonials", name: "Testimonials", value: pendingTestimonials, color: "#a855f7" },
      {
        key: "commitment_letters",
        name: "Commitment letters",
        value: pendingCommitmentLetters,
        color: "#6366f1",
      },
    ],
    clientTiers: [
      { key: "heal", name: "Heal (paid)", value: healClients },
      { key: "consultancy_only", name: "Consultancy only", value: consultancyClients },
    ],
  };

  return {
    totalClients,
    healClients,
    consultancyClients,
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

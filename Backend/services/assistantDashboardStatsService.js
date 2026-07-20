const {
  getAssistantWellnessCoachById,
  populateWellnessCoach,
} = require("../models/assistantWellnessCoachModel");
const { listUsersByAssignedCoachId, toPublicUser } = require("../models/userModel");
const { queryMealLogsByCoachId } = require("../models/mealTrackingModel");
const { listUserCommitmentLetters } = require("../models/userCommitmentLetterModel");
const { listClientTestimonials } = require("../models/clientTestimonials");
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

function filterForAssistant(rows, assistantId) {
  return (rows || []).filter(
    (row) =>
      String(row.assignedCoachType || "") === "assistant_wellness_coach" &&
      String(row.assignedCoachId || "") === String(assistantId)
  );
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
  const assistant = await getAssistantWellnessCoachById(assistantId);
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
      page: 1,
      limit: 200,
      userTier: "client",
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
  const { healClients, consultancyClients } = countClientsByTier(clients);
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

  const assistantProfile = await populateWellnessCoach(assistant);

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
      { key: "heal", name: "Heal (paid)", value: healClients },
      { key: "consultancy_only", name: "Consultancy only", value: consultancyClients },
    ],
  };

  return {
    totalClients,
    healClients,
    consultancyClients,
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

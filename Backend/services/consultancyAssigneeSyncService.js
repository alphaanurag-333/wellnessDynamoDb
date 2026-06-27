const {
  listTransactionsByUserId,
  updateConsultancyTransaction,
} = require("../models/consultancyTransactionModel");
const { getWellnessCoachRecordById } = require("../models/wellnessCoachModel");
const { getAssistantWellnessCoachById } = require("../models/assistantWellnessCoachModel");
const { normalizeAssignedCoachType } = require("../models/userAssignmentLogic");

function contactSnapshot(entity, type) {
  if (!entity) return null;
  return {
    id: entity.id,
    type,
    name: entity.name || null,
    email: entity.email || null,
    phone: entity.phone || null,
    phoneCountryCode: entity.phoneCountryCode || null,
  };
}

async function buildConsultancyAssigneeFields({ assignedCoachId, assignedCoachType, parentCoachId }) {
  const coachType = normalizeAssignedCoachType(assignedCoachType);
  const parentId = String(parentCoachId || "").trim();

  if (coachType === "wellness_coach") {
    const coach = await getWellnessCoachRecordById(assignedCoachId);
    if (!coach) return null;
    return {
      meetingAssigneeType: "wellness_coach",
      meetingAssigneeId: coach.id,
      parentCoachId: parentId,
      visibleToCoachIds: [coach.id],
      assigneeSnapshot: contactSnapshot(coach, "wellness_coach"),
    };
  }

  if (coachType === "assistant_wellness_coach") {
    const assistant = await getAssistantWellnessCoachById(assignedCoachId);
    if (!assistant) return null;
    return {
      meetingAssigneeType: "assistant_wellness_coach",
      meetingAssigneeId: assistant.id,
      parentCoachId: parentId,
      visibleToCoachIds: [assistant.id, parentId].filter(Boolean),
      assigneeSnapshot: contactSnapshot(assistant, "assistant_wellness_coach"),
    };
  }

  return null;
}

/**
 * After admin/coach assignment, mirror assignee onto the latest paid consultancy transaction
 * so coach portals (enrolled users, transactions) can find the client.
 */
async function syncConsultancyAssigneeForUser(userId, assignment) {
  const { items } = await listTransactionsByUserId(userId, {
    page: 1,
    limit: 5,
    paymentStatus: "paid",
    productType: "consultancy",
  });
  const latest = items[0];
  if (!latest) return null;

  const fields = await buildConsultancyAssigneeFields(assignment);
  if (!fields) return null;

  return updateConsultancyTransaction(latest.id, fields);
}

module.exports = {
  buildConsultancyAssigneeFields,
  syncConsultancyAssigneeForUser,
};

const { getAppConfig } = require("../models/appConfigModel");
const { getAdminByEmail } = require("../models/adminModel");
const { getReferralCodeRecord } = require("../models/referralCodeModel");
const { getUserById } = require("../models/userModel");
const { getWellnessCoachRecordById } = require("../models/wellnessCoachModel");
const { getAssistantWellnessCoachById } = require("../models/assistantWellnessCoachModel");
const { loadReferralContext } = require("../models/userConversionModel");

function contactFromEntity(entity, type) {
  if (!entity) return null;
  return {
    id: entity.id,
    type,
    name: entity.name || null,
    email: entity.email || null,
    phone: entity.phone || null,
    phoneCountryCode: entity.phoneCountryCode || null,
    whatsappSameAsMobile: entity.whatsappSameAsMobile,
    whatsappPhone: entity.whatsappPhone,
    whatsappCountryCode: entity.whatsappCountryCode,
  };
}

function resolveWhatsappNumber(entity) {
  if (!entity) return null;
  if (entity.whatsappSameAsMobile) {
    const phone = String(entity.phone || "").trim();
    const cc = String(entity.phoneCountryCode || "").trim();
    if (!phone) return null;
    return { phone, phoneCountryCode: cc };
  }
  const phone = String(entity.whatsappPhone || entity.phone || "").trim();
  const cc = String(entity.whatsappCountryCode || entity.phoneCountryCode || "").trim();
  if (!phone) return null;
  return { phone, phoneCountryCode: cc };
}

async function resolveDefaultAdmin() {
  const config = await getAppConfig();
  if (config?.app_email) {
    const admin = await getAdminByEmail(config.app_email);
    if (admin) return admin;
  }
  return {
    id: "admin",
    name: config?.app_name ? `${config.app_name} Admin` : "Admin",
    email: config?.app_email || null,
    phone: config?.app_mobile || null,
    phoneCountryCode: "+91",
    whatsappSameAsMobile: true,
    whatsappPhone: null,
    whatsappCountryCode: null,
  };
}

/**
 * Resolve who the consultancy meeting is scheduled with based on referral code.
 * No code → Admin. Coach/assistant/user codes follow product rules.
 */
async function resolveMeetingAssignee(referralCodeInput) {
  const normalizedInput = referralCodeInput ? String(referralCodeInput).trim().toUpperCase() : "";

  if (!normalizedInput) {
    const admin = await resolveDefaultAdmin();
    return {
      assigneeType: "admin",
      assigneeId: admin.id,
      assignee: contactFromEntity(admin, "admin"),
      parentCoachId: null,
      visibleToCoachIds: [],
      referralCodeUsed: null,
      referralEntityType: null,
      referralEntityId: null,
    };
  }

  const referralRecord = await getReferralCodeRecord(normalizedInput);
  if (!referralRecord) {
    const err = new Error("Invalid referral code");
    err.name = "InvalidReferralCodeError";
    throw err;
  }

  const context = await loadReferralContext(referralRecord);

  if (referralRecord.entityType === "wellness_coach") {
    const coach = context.wellnessCoach;
    if (!coach || coach.status !== "active") {
      const err = new Error("Invalid referral code");
      err.name = "InvalidReferralCodeError";
      throw err;
    }
    return {
      assigneeType: "wellness_coach",
      assigneeId: coach.id,
      assignee: contactFromEntity(coach, "wellness_coach"),
      parentCoachId: coach.id,
      visibleToCoachIds: [coach.id],
      referralCodeUsed: referralRecord.referralCode,
      referralEntityType: "wellness_coach",
      referralEntityId: coach.id,
    };
  }

  if (referralRecord.entityType === "assistant_wellness_coach") {
    const assistant = context.assistantWellnessCoach;
    if (!assistant || assistant.status !== "active") {
      const err = new Error("Invalid referral code");
      err.name = "InvalidReferralCodeError";
      throw err;
    }
    const parentCoachId = String(assistant.wellnessCoachId || "").trim();
    if (!parentCoachId) {
      const err = new Error("Invalid referral code");
      err.name = "InvalidReferralCodeError";
      throw err;
    }
    const visibleToCoachIds = [assistant.id, parentCoachId];
    return {
      assigneeType: "assistant_wellness_coach",
      assigneeId: assistant.id,
      assignee: contactFromEntity(assistant, "assistant_wellness_coach"),
      parentCoachId,
      visibleToCoachIds,
      referralCodeUsed: referralRecord.referralCode,
      referralEntityType: "assistant_wellness_coach",
      referralEntityId: assistant.id,
    };
  }

  if (referralRecord.entityType === "user") {
    const referer = context.refererUser;
    if (!referer) {
      const err = new Error("Invalid referral code");
      err.name = "InvalidReferralCodeError";
      throw err;
    }

    const assignedCoachId = String(referer.assignedCoachId || "").trim();
    const assignedCoachType = String(referer.assignedCoachType || "").trim();
    const owningCoachId = String(referer.parentCoachId || "").trim();

    // Prefer the referrer's direct assignee (coach or assistant) when assigned.
    if (
      String(referer.assignmentStatus || "").toLowerCase() === "assigned" &&
      assignedCoachId &&
      (assignedCoachType === "wellness_coach" || assignedCoachType === "assistant_wellness_coach") &&
      owningCoachId
    ) {
      if (assignedCoachType === "assistant_wellness_coach") {
        const assistant = await getAssistantWellnessCoachById(assignedCoachId);
        if (!assistant || assistant.status !== "active") {
          const err = new Error("Invalid referral code");
          err.name = "InvalidReferralCodeError";
          throw err;
        }
        return {
          assigneeType: "assistant_wellness_coach",
          assigneeId: assistant.id,
          assignee: contactFromEntity(assistant, "assistant_wellness_coach"),
          parentCoachId: owningCoachId,
          visibleToCoachIds: [assistant.id, owningCoachId],
          referralCodeUsed: referralRecord.referralCode,
          referralEntityType: "user",
          referralEntityId: referer.id,
        };
      }

      const coach = await getWellnessCoachRecordById(assignedCoachId);
      if (!coach || coach.status !== "active") {
        const err = new Error("Invalid referral code");
        err.name = "InvalidReferralCodeError";
        throw err;
      }
      return {
        assigneeType: "wellness_coach",
        assigneeId: coach.id,
        assignee: contactFromEntity(coach, "wellness_coach"),
        parentCoachId: coach.id,
        visibleToCoachIds: [coach.id],
        referralCodeUsed: referralRecord.referralCode,
        referralEntityType: "user",
        referralEntityId: referer.id,
      };
    }

    // Fallback: owning wellness coach only.
    if (owningCoachId) {
      const coach = await getWellnessCoachRecordById(owningCoachId);
      if (!coach || coach.status !== "active") {
        const err = new Error("Invalid referral code");
        err.name = "InvalidReferralCodeError";
        throw err;
      }
      return {
        assigneeType: "wellness_coach",
        assigneeId: coach.id,
        assignee: contactFromEntity(coach, "wellness_coach"),
        parentCoachId: coach.id,
        visibleToCoachIds: [coach.id],
        referralCodeUsed: referralRecord.referralCode,
        referralEntityType: "user",
        referralEntityId: referer.id,
      };
    }

    // Referrer has no coach — meeting stays with admin until assignment.
    const err = new Error("Referring user has no assigned coach");
    err.name = "InvalidReferralCodeError";
    throw err;
  }

  const err = new Error("Invalid referral code");
  err.name = "InvalidReferralCodeError";
  throw err;
}

module.exports = {
  resolveWhatsappNumber,
  resolveDefaultAdmin,
  resolveMeetingAssignee,
};

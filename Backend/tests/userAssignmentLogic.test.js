const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveConversionAssignment,
  validateHealUserAssignment,
  resolveReassignmentPatch,
  isWellnessTrackingTier,
  matchesAssignedClientTier,
} = require("../models/userAssignmentLogic");

const COACH_ID = "coach-001";
const ASSISTANT_ID = "assistant-001";
const USER_A_ID = "user-a";
const USER_B_ID = "user-b";
const USER_C_ID = "user-c";

function coachRecord(id = COACH_ID) {
  return { id, status: "active", name: "Coach One" };
}

function assistantRecord(id = ASSISTANT_ID, wellnessCoachId = COACH_ID) {
  return { id, wellnessCoachId, status: "active", name: "Assistant One" };
}

function healUser(id, parentCoachId) {
  return {
    id,
    userTier: "heal",
    parentCoachId,
    assignmentStatus: "assigned",
    assignedCoachId: parentCoachId,
    assignedCoachType: "wellness_coach",
  };
}

describe("resolveConversionAssignment", () => {
  it("assigns directly to wellness coach when coach referral code is used", () => {
    const referralRecord = {
      referralCode: "COACH123",
      entityType: "wellness_coach",
      entityId: COACH_ID,
      ownerCoachId: COACH_ID,
    };

    const result = resolveConversionAssignment(
      referralRecord,
      { wellnessCoach: coachRecord() },
      "COACH123"
    );

    assert.equal(result.assignmentStatus, "assigned");
    assert.equal(result.assignedCoachId, COACH_ID);
    assert.equal(result.assignedCoachType, "wellness_coach");
    assert.equal(result.parentCoachId, COACH_ID);
    assert.equal(result.referredByEntityType, "wellness_coach");
    assert.equal(result.referredByEntityId, COACH_ID);
    assert.equal(result.referredByUserId, null);
    assert.equal(result.referredByCode, "COACH123");
  });

  it("assigns to assistant and rolls up parent coach when assistant referral code is used", () => {
    const referralRecord = {
      referralCode: "ASST1234",
      entityType: "assistant_wellness_coach",
      entityId: ASSISTANT_ID,
      ownerCoachId: COACH_ID,
    };

    const result = resolveConversionAssignment(
      referralRecord,
      { assistantWellnessCoach: assistantRecord() },
      "ASST1234"
    );

    assert.equal(result.assignmentStatus, "assigned");
    assert.equal(result.assignedCoachId, ASSISTANT_ID);
    assert.equal(result.assignedCoachType, "assistant_wellness_coach");
    assert.equal(result.parentCoachId, COACH_ID);
    assert.equal(result.referredByEntityType, "assistant_wellness_coach");
    assert.equal(result.referredByEntityId, ASSISTANT_ID);
  });

  it("assigns to referring heal user's owning coach for peer referral", () => {
    const referralRecord = {
      referralCode: "PEER1111",
      entityType: "user",
      entityId: USER_A_ID,
      ownerCoachId: COACH_ID,
    };

    const result = resolveConversionAssignment(
      referralRecord,
      { refererUser: healUser(USER_A_ID, COACH_ID) },
      "PEER1111"
    );

    assert.equal(result.assignedCoachId, COACH_ID);
    assert.equal(result.assignedCoachType, "wellness_coach");
    assert.equal(result.parentCoachId, COACH_ID);
    assert.equal(result.referredByUserId, USER_A_ID);
    assert.equal(result.referredByEntityType, "user");
    assert.notEqual(result.assignedCoachId, USER_A_ID);
  });

  it("resolves chained peer referral to the root wellness coach without walking the chain", () => {
    const referralRecord = {
      referralCode: "PEER2222",
      entityType: "user",
      entityId: USER_B_ID,
      ownerCoachId: COACH_ID,
    };

    const userB = healUser(USER_B_ID, COACH_ID);
    userB.referredByUserId = USER_A_ID;

    const result = resolveConversionAssignment(
      referralRecord,
      { refererUser: userB },
      "PEER2222"
    );

    assert.equal(result.assignedCoachId, COACH_ID);
    assert.equal(result.parentCoachId, COACH_ID);
    assert.equal(result.referredByUserId, USER_B_ID);
    assert.notEqual(result.assignedCoachId, USER_B_ID);
  });

  it("resolves three-level peer chain (C referred by B referred by A) to stored owning coach", () => {
    const referralRecord = {
      referralCode: "PEER3333",
      entityType: "user",
      entityId: USER_C_ID,
      ownerCoachId: COACH_ID,
    };

    const userC = healUser(USER_C_ID, COACH_ID);
    userC.referredByUserId = USER_B_ID;

    const result = resolveConversionAssignment(
      referralRecord,
      { refererUser: userC },
      "PEER3333"
    );

    assert.equal(result.assignedCoachId, COACH_ID);
    assert.equal(result.referredByUserId, USER_C_ID);
  });

  it("leaves user pending admin assignment when no referral code is provided", () => {
    const result = resolveConversionAssignment(null, {}, null);

    assert.equal(result.assignmentStatus, "pending_admin");
    assert.equal(result.assignedCoachId, null);
    assert.equal(result.parentCoachId, null);
    assert.equal(result.referredByCode, null);
  });

  it("rejects invalid referral code", () => {
    assert.throws(
      () => resolveConversionAssignment(null, {}, "MISSING"),
      (err) => err.name === "InvalidReferralCodeError"
    );
  });

  it("leaves peer referral pending admin when referer has no owning coach", () => {
    const referralRecord = {
      referralCode: "PEER4444",
      entityType: "user",
      entityId: USER_A_ID,
      ownerCoachId: "pending",
    };

    const pendingReferer = {
      id: USER_A_ID,
      userTier: "heal",
      parentCoachId: null,
      assignmentStatus: "pending_admin",
    };

    const result = resolveConversionAssignment(
      referralRecord,
      { refererUser: pendingReferer },
      "PEER4444"
    );

    assert.equal(result.assignmentStatus, "pending_admin");
    assert.equal(result.assignedCoachId, null);
    assert.equal(result.parentCoachId, null);
    assert.equal(result.referredByUserId, USER_A_ID);
    assert.equal(result.referredByCode, "PEER4444");
    assert.equal(result.assignmentSource, "referral");
  });

  it("accepts seek peer referral and leaves pending admin when referer has no coach", () => {
    const referralRecord = {
      referralCode: "SEEK1111",
      entityType: "user",
      entityId: USER_A_ID,
      ownerCoachId: "pending",
    };

    const seekReferer = {
      id: USER_A_ID,
      userTier: "seek",
      parentCoachId: null,
      assignmentStatus: null,
    };

    const result = resolveConversionAssignment(
      referralRecord,
      { refererUser: seekReferer },
      "SEEK1111"
    );

    assert.equal(result.assignmentStatus, "pending_admin");
    assert.equal(result.referredByUserId, USER_A_ID);
    assert.equal(result.referredByEntityType, "user");
  });

  it("inherits assistant assignment from referer when referer is assigned to an assistant", () => {
    const referralRecord = {
      referralCode: "PEER5555",
      entityType: "user",
      entityId: USER_A_ID,
      ownerCoachId: COACH_ID,
    };

    const referer = {
      id: USER_A_ID,
      userTier: "heal",
      assignmentStatus: "assigned",
      assignedCoachId: ASSISTANT_ID,
      assignedCoachType: "assistant_wellness_coach",
      parentCoachId: COACH_ID,
    };

    const result = resolveConversionAssignment(
      referralRecord,
      { refererUser: referer },
      "PEER5555"
    );

    assert.equal(result.assignmentStatus, "assigned");
    assert.equal(result.assignedCoachId, ASSISTANT_ID);
    assert.equal(result.assignedCoachType, "assistant_wellness_coach");
    assert.equal(result.parentCoachId, COACH_ID);
  });
});

describe("validateHealUserAssignment", () => {
  it("accepts seek users without assignment fields", () => {
    const result = validateHealUserAssignment({ userTier: "seek" });
    assert.equal(result.valid, true);
  });

  it("accepts assigned heal user with consistent coach fields", () => {
    const result = validateHealUserAssignment({
      userTier: "heal",
      assignmentStatus: "assigned",
      assignedCoachId: COACH_ID,
      assignedCoachType: "wellness_coach",
      parentCoachId: COACH_ID,
    });
    assert.equal(result.valid, true);
  });

  it("accepts pending admin heal user without coach fields", () => {
    const result = validateHealUserAssignment({
      userTier: "heal",
      assignmentStatus: "pending_admin",
    });
    assert.equal(result.valid, true);
  });

  it("rejects heal user marked assigned without parentCoachId", () => {
    const result = validateHealUserAssignment({
      userTier: "heal",
      assignmentStatus: "assigned",
      assignedCoachId: COACH_ID,
      assignedCoachType: "wellness_coach",
      parentCoachId: null,
    });
    assert.equal(result.valid, false);
  });
});

describe("resolveReassignmentPatch", () => {
  it("builds reassignment patch without touching referral history fields", () => {
    const patch = resolveReassignmentPatch({
      assignedCoachId: ASSISTANT_ID,
      assignedCoachType: "assistant_wellness_coach",
      parentCoachId: COACH_ID,
    });

    assert.equal(patch.assignedCoachId, ASSISTANT_ID);
    assert.equal(patch.assignedCoachType, "assistant_wellness_coach");
    assert.equal(patch.parentCoachId, COACH_ID);
    assert.equal(patch.assignmentStatus, "assigned");
    assert.equal(Object.hasOwn(patch, "referredByUserId"), false);
  });
});

describe("wellness tracking tiers", () => {
  it("treats seek, consultancy_only, and heal as tracking-eligible", () => {
    assert.equal(isWellnessTrackingTier("seek"), true);
    assert.equal(isWellnessTrackingTier("consultancy_only"), true);
    assert.equal(isWellnessTrackingTier("heal"), true);
  });

  it("includes seek users in coach client list filter", () => {
    assert.equal(matchesAssignedClientTier("seek", "client"), true);
    assert.equal(matchesAssignedClientTier("consultancy_only", "client"), true);
    assert.equal(matchesAssignedClientTier("heal", "client"), true);
    assert.equal(matchesAssignedClientTier("heal", "seek"), false);
    assert.equal(matchesAssignedClientTier("seek", "all"), true);
  });
});

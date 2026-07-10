const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { omitExistingHistoryFields } = require("../models/userConversionModel");

describe("omitExistingHistoryFields", () => {
  it("drops convertedAt when user already has conversion history", () => {
    const user = { convertedAt: "2026-01-01T00:00:00.000Z" };
    const updates = omitExistingHistoryFields(
      { userTier: "heal", convertedAt: "2026-07-10T00:00:00.000Z", referralCode: "ABC12345" },
      user
    );
    assert.equal(updates.convertedAt, undefined);
    assert.equal(updates.userTier, "heal");
    assert.equal(updates.referralCode, "ABC12345");
  });

  it("drops referredBy fields when already set but keeps new assignment fields", () => {
    const user = {
      convertedAt: "2026-01-01T00:00:00.000Z",
      referredByCode: "OLD12345",
      referredByEntityId: "coach-1",
    };
    const updates = omitExistingHistoryFields(
      {
        userTier: "heal",
        convertedAt: "2026-07-10T00:00:00.000Z",
        referredByCode: "NEW99999",
        referredByEntityId: "coach-2",
        assignedCoachId: "coach-2",
        assignmentStatus: "assigned",
      },
      user
    );
    assert.equal(updates.convertedAt, undefined);
    assert.equal(updates.referredByCode, undefined);
    assert.equal(updates.referredByEntityId, undefined);
    assert.equal(updates.assignedCoachId, "coach-2");
    assert.equal(updates.assignmentStatus, "assigned");
  });

  it("includes history fields on first conversion", () => {
    const updates = omitExistingHistoryFields(
      { userTier: "heal", convertedAt: "2026-07-10T00:00:00.000Z", referredByCode: "REF11111" },
      { userTier: "seek" }
    );
    assert.equal(updates.convertedAt, "2026-07-10T00:00:00.000Z");
    assert.equal(updates.referredByCode, "REF11111");
  });
});

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { pickIdentityUser } = require("../models/userModel");

describe("pickIdentityUser", () => {
  it("returns the new account when a deleted user still shares the same email or phone", () => {
    const deleted = {
      id: "old-user",
      status: "deleted",
      assignedCoachId: "awc-1",
      assignedCoachType: "assistant_wellness_coach",
      parentCoachId: "wc-1",
    };
    const fresh = {
      id: "new-user",
      status: "active",
      assignedCoachId: null,
      parentCoachId: null,
    };

    assert.equal(pickIdentityUser([deleted, fresh]).id, "new-user");
    assert.equal(pickIdentityUser([fresh, deleted]).id, "new-user");
  });

  it("returns the deleted account only when no live account exists", () => {
    const deleted = { id: "old-user", status: "deleted", parentCoachId: "wc-1" };
    assert.equal(pickIdentityUser([deleted]).id, "old-user");
    assert.equal(pickIdentityUser([]), null);
  });
});

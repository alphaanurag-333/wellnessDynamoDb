const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { matchesInboxVisibility } = require("../models/adminActivityModel");

describe("matchesInboxVisibility", () => {
  it("shows a team reminder only to the recipient account", () => {
    const row = { recipientAccountId: "coach-1", title: "Please review pending items" };
    assert.equal(matchesInboxVisibility(row, "coach-1", new Set(["client-a"])), true);
    assert.equal(matchesInboxVisibility(row, "coach-2", new Set(["client-a"])), false);
    assert.equal(matchesInboxVisibility(row, "admin-1", null), false);
  });

  it("keeps client-scoped activities on a coach roster", () => {
    const row = { subjectUserId: "client-a", title: "Meal logged" };
    assert.equal(matchesInboxVisibility(row, "coach-1", new Set(["client-a"])), true);
    assert.equal(matchesInboxVisibility(row, "coach-1", new Set(["client-b"])), false);
  });

  it("lets admin see unscoped activity but not another person's reminder", () => {
    const activity = { subjectUserId: "client-a", title: "Payment received" };
    const reminder = { recipientAccountId: "coach-1", title: "Nudge" };
    assert.equal(matchesInboxVisibility(activity, "admin-1", null), true);
    assert.equal(matchesInboxVisibility(reminder, "admin-1", null), false);
  });
});

const test = require("node:test");
const assert = require("node:assert/strict");

const { isUserInboxNotification } = require("../models/notificationModel");

test("pushOnly bedtime reminders are hidden from user notification inbox API", () => {
  assert.equal(isUserInboxNotification({ kind: "daily_reflection_reminder", pushOnly: true }), false);
  assert.equal(isUserInboxNotification({ kind: "daily_reflection_reminder" }), true);
  assert.equal(isUserInboxNotification({ kind: "meal_log_submitted" }), true);
});

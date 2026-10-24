const test = require("node:test");
const assert = require("node:assert/strict");

const {
  subtractMinutesFromBedtime,
  REMINDER_OFFSET_MINUTES,
} = require("../services/dailyReflectionBedtimeJobService");
const {
  buildDailyReflectionBedtimeMessage,
} = require("../services/notificationDispatchService");

test("subtractMinutesFromBedtime uses 30 minute offset before bedtime", () => {
  assert.equal(REMINDER_OFFSET_MINUTES, 30);
  assert.equal(subtractMinutesFromBedtime("22:30"), "22:00");
  assert.equal(subtractMinutesFromBedtime("00:15"), "23:45");
});

test("buildDailyReflectionBedtimeMessage matches product copy", () => {
  assert.equal(
    buildDailyReflectionBedtimeMessage("18:01"),
    "Your daily reflection form is ready. Log tonight's check-in around 6:01."
  );
  assert.equal(
    buildDailyReflectionBedtimeMessage("22:30"),
    "Your daily reflection form is ready. Log tonight's check-in around 10:30."
  );
});

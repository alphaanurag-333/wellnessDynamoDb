const config = require("../config");
const {
  listAllDailyReflectionSettings,
  getDayLog,
} = require("../models/dailyReflectionModel");
const { ensureDailyReflectionBedtimeReminderNotification } = require("./notificationDispatchService");
const { todayInTimezone } = require("../utils/birthdayTimezone");

const DEFAULT_BEDTIME = "22:30";
const REMINDER_OFFSET_MINUTES = 30;

function subtractMinutesFromBedtime(bedtime, offsetMinutes = REMINDER_OFFSET_MINUTES) {
  const raw = String(bedtime || DEFAULT_BEDTIME).trim();
  const [h, m] = raw.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const total = ((h * 60 + m) - offsetMinutes + 24 * 60) % (24 * 60);
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function currentClockInTimezone(timezone) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = String(map.hour ?? "").padStart(2, "0");
  const minute = String(map.minute ?? "").padStart(2, "0");
  return `${hour}:${minute}`;
}

/**
 * Send daily reflection reminders for users whose unlock time (bedtime − 30 min) matches now.
 */
async function runDailyReflectionBedtimeJob(options = {}) {
  const timezone = options.timezone || config.dailyReflectionBedtimeCronTimezone;
  const dateOnly = options.dateOnly || todayInTimezone(timezone).dateOnly;
  const nowClock = options.nowClock || currentClockInTimezone(timezone);

  const settingsRows = await listAllDailyReflectionSettings();
  const results = {
    timezone,
    dateOnly,
    nowClock,
    matchedUsers: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const row of settingsRows) {
    const userId = String(row.userId || "").trim();
    if (!userId) continue;

    const bedtime = row.bedtime || DEFAULT_BEDTIME;
    const unlockClock = subtractMinutesFromBedtime(bedtime);
    if (!unlockClock || unlockClock !== nowClock) continue;

    results.matchedUsers += 1;

    try {
      const todayLog = await getDayLog(userId, dateOnly);
      if (todayLog?.submittedAt) {
        results.skipped += 1;
        results.details.push({ userId, status: "skipped_already_submitted" });
        continue;
      }

      const { notification, push } = await ensureDailyReflectionBedtimeReminderNotification({
        userId,
        bedtime,
        occurrenceDate: dateOnly,
      });

      const notificationId = notification?.id || notification?._id || null;
      const delivered = Boolean(push && !push.skipped && Number(push.successCount) > 0);
      const noDevice = Boolean(push?.skipped && push?.reason === "no_token");

      if (!notificationId) {
        results.skipped += 1;
        results.details.push({ userId, status: "skipped_no_notification" });
      } else if (delivered) {
        results.sent += 1;
        results.details.push({
          userId,
          status: "sent",
          notificationId,
          pushDelivered: true,
        });
      } else if (noDevice) {
        results.skipped += 1;
        results.details.push({
          userId,
          status: "skipped_no_fcm_token",
          notificationId,
          pushReason: push?.reason || "no_token",
        });
      } else {
        results.failed += 1;
        results.details.push({
          userId,
          status: "push_failed",
          notificationId,
          pushReason: push?.reason || "send_error",
          pushFailureCount: Number(push?.failureCount) || 0,
        });
      }
    } catch (err) {
      results.failed += 1;
      results.details.push({
        userId,
        status: "failed",
        error: err?.message || String(err),
      });
    }
  }

  return results;
}

module.exports = {
  DEFAULT_BEDTIME,
  REMINDER_OFFSET_MINUTES,
  subtractMinutesFromBedtime,
  currentClockInTimezone,
  runDailyReflectionBedtimeJob,
};

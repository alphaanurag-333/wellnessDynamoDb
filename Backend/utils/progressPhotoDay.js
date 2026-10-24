const DAY_TIME_ZONE = "Asia/Kolkata";

function progressPhotoCalendarDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function recordStamp(record) {
  return record?.recordedAt || record?.createdAt || "";
}

function recordsOnSameDay(records, day) {
  if (!day) return [];
  return (records || []).filter((record) => progressPhotoCalendarDay(recordStamp(record)) === day);
}

module.exports = {
  DAY_TIME_ZONE,
  progressPhotoCalendarDay,
  recordStamp,
  recordsOnSameDay,
};

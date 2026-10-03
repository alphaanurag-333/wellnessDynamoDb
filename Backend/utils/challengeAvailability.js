const IST_TZ = "Asia/Kolkata";

function todayIstDateString(reference = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);
}

function challengeEndDate(challenge) {
  const raw = String(challenge?.endDate || "").trim();
  if (!raw) return "";
  return raw.includes("T") ? raw.slice(0, 10) : raw;
}

/** Published challenges stay in the app through the end date (IST). After that they are hidden. */
function isChallengeOpenInApp(challenge, today = todayIstDateString()) {
  if (!challenge) return false;
  if (String(challenge.status || "").toLowerCase() !== "published") return false;
  const end = challengeEndDate(challenge);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;
  return end >= today;
}

module.exports = {
  todayIstDateString,
  challengeEndDate,
  isChallengeOpenInApp,
};

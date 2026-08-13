export const PROTOCOL_ONBOARDING_STEP = 8;

export function pointCountLabel(count) {
  return `${count} point${count === 1 ? "" : "s"}`;
}

export function formatProtocolSavedAt(date = new Date()) {
  const formatted = date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
  return `${formatted} IST`;
}

export function historyDeltaLabel(currentCount, previousCount) {
  const delta = currentCount - (previousCount ?? 0);
  if (delta === 0) return "No change vs previous";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} vs previous`;
}

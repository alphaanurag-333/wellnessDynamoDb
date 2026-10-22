const TERMINAL_TRACK_STATUSES = new Set(["completed", "cancelled", "follow_up_needed"]);

function calendarDayFrom(value) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function formatCounsellingDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCounsellingReviewDay(value) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function pushCandidate(candidates, rawInstant, label) {
  const at = new Date(rawInstant).getTime();
  if (Number.isNaN(at) || !label) return;
  candidates.push({ at, label });
}

/** Prescription reviews plus completed/cancelled sessions that are not tied to a review day. */
export function mergeMeetingsWithOrphanTracks(meetings, tracks) {
  const rows = Array.isArray(meetings) ? [...meetings] : [];
  const coveredDays = new Set(rows.map((row) => row.date).filter(Boolean));
  const coveredIds = new Set(rows.map((row) => String(row.id || "")).filter(Boolean));

  for (const track of Array.isArray(tracks) ? tracks : []) {
    const status = String(track?.status || "").toLowerCase();
    if (!TERMINAL_TRACK_STATUSES.has(status)) continue;

    const trackId = String(track.id || "").trim();
    if (trackId && coveredIds.has(trackId)) continue;

    const date =
      calendarDayFrom(track.scheduledAt)
      || calendarDayFrom(track.selectedDate)
      || calendarDayFrom(track.createdAt);
    if (date && coveredDays.has(date)) continue;

    rows.push({
      id: trackId || `track-${date || status}`,
      date: date || "",
      reviewStatus: status === "cancelled" ? "cancelled" : "active",
      scheduledDate: calendarDayFrom(track.scheduledAt),
      scheduledAt: track.scheduledAt || null,
      completedDate:
        status === "completed"
          ? calendarDayFrom(track.updatedAt || track.scheduledAt)
          : null,
      completedAt:
        status === "completed" ? (track.updatedAt || track.scheduledAt || null) : null,
      cancelledDate: status === "cancelled" ? calendarDayFrom(track.updatedAt) : null,
      cancelledAt: status === "cancelled" ? (track.updatedAt || null) : null,
    });
    if (date) coveredDays.add(date);
    if (trackId) coveredIds.add(trackId);
  }

  return rows.sort(
    (a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)),
  );
}

/** Most recent past counselling (completed reviews or sessions), not upcoming scheduled slots. */
export function latestCounsellingLabel(tracks, meetings) {
  const now = Date.now();
  const candidates = [];

  for (const track of Array.isArray(tracks) ? tracks : []) {
    const status = String(track?.status || "").toLowerCase();
    if (status === "completed" || status === "follow_up_needed") {
      const raw = track.updatedAt || track.scheduledAt;
      pushCandidate(candidates, raw, formatCounsellingDateTime(raw));
      continue;
    }
    if (status === "scheduled" && track.scheduledAt) {
      const at = new Date(track.scheduledAt).getTime();
      if (!Number.isNaN(at) && at <= now) {
        pushCandidate(candidates, track.scheduledAt, formatCounsellingDateTime(track.scheduledAt));
      }
    }
  }

  for (const meeting of Array.isArray(meetings) ? meetings : []) {
    if (meeting?.cancelled || String(meeting?.reviewStatus || "").toLowerCase() === "cancelled") {
      continue;
    }
    if (meeting.completedAt) {
      pushCandidate(candidates, meeting.completedAt, formatCounsellingDateTime(meeting.completedAt));
      continue;
    }
    if (meeting.scheduledAt) {
      const at = new Date(meeting.scheduledAt).getTime();
      if (!Number.isNaN(at) && at <= now) {
        pushCandidate(candidates, meeting.scheduledAt, formatCounsellingDateTime(meeting.scheduledAt));
        continue;
      }
    }
    const day = calendarDayFrom(meeting.date);
    if (day) {
      pushCandidate(candidates, `${day}T12:00:00+05:30`, formatCounsellingReviewDay(day));
    }
  }

  candidates.sort((a, b) => b.at - a.at);
  return candidates[0]?.label || "";
}

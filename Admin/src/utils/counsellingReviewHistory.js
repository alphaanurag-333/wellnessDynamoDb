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

    const initiatedByRole = (() => {
      const stored = String(track?.initiatedByRole || "").toLowerCase();
      if (stored === "client" || stored === "user") return "client";
      if (stored === "coach" || stored === "staff") return "coach";
      if (Array.isArray(track?.periodOffers) && track.periodOffers.length) return "coach";
      if (track?.scheduledAt) return "coach";
      if (String(track?.status || "").toLowerCase() === "requested") return "client";
      return "coach";
    })();
    const sessionStatus =
      status === "cancelled" ? "cancel" : status === "completed" || status === "follow_up_needed" ? "complete" : "pending";

    rows.push({
      id: trackId || `track-${date || status}`,
      date: date || "",
      reviewStatus: status === "cancelled" ? "cancelled" : "active",
      trackStatus: status,
      initiatedByRole,
      sessionStatus,
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

export function reviewScheduleByLabel(meeting) {
  const role = String(meeting?.initiatedByRole || "").toLowerCase();
  return role === "client" ? "Client" : "You";
}

export function reviewTrackingStatusLabel(meeting) {
  const session = String(meeting?.sessionStatus || "").toLowerCase();
  if (session === "complete") return "Completed";
  if (session === "cancel") return "Cancelled";
  if (session === "pending") {
    const trackStatus = String(meeting?.trackStatus || "").toLowerCase();
    if (trackStatus === "scheduled") return "Scheduled";
    return "Pending";
  }

  const reviewStatus = String(meeting?.reviewStatus || "").toLowerCase();
  const trackStatus = String(meeting?.trackStatus || "").toLowerCase();
  if (meeting?.cancelled || reviewStatus === "cancelled" || trackStatus === "cancelled") {
    return "Cancelled";
  }
  if (trackStatus === "completed" || trackStatus === "follow_up_needed") return "Completed";
  if (reviewStatus === "active" && (meeting?.completedAt || meeting?.completedDate)) {
    return "Completed";
  }
  if (trackStatus === "scheduled" && meeting?.scheduledAt) return "Scheduled";
  if (trackStatus && !["completed", "cancelled", "follow_up_needed"].includes(trackStatus)) {
    return "Pending";
  }
  return "Pending";
}

export function meetingHistoryDateLabel(meeting) {
  const instant = meeting?.completedAt || meeting?.scheduledAt;
  if (instant) {
    const formatted = formatCounsellingDateTime(instant);
    if (formatted) return formatted;
  }
  const day = calendarDayFrom(meeting?.date || meeting?.completedDate || meeting?.scheduledDate);
  if (day) return formatCounsellingReviewDay(day);
  return "—";
}

export function mapCounsellingHistoryModalItems(meetings, assignments = []) {
  const assignmentById = new Map(
    (Array.isArray(assignments) ? assignments : []).map((row) => [String(row.id), row]),
  );
  const rows = Array.isArray(meetings) ? meetings : [];
  return rows.map((meeting, index) => {
    const assignment = assignmentById.get(String(meeting.id));
    const summary =
      String(meeting.summary || "").trim()
      || String(assignment?.summary || "").trim()
      || "Counselling session";
    const cancelled =
      Boolean(meeting?.cancelled)
      || String(meeting?.reviewStatus || "").toLowerCase() === "cancelled";
    return {
      id: String(meeting.id || `review-${index}`),
      reviewLabel: `Review ${Math.max(rows.length - index, 1)}`,
      dateLabel: meetingHistoryDateLabel(meeting),
      statusLabel: reviewTrackingStatusLabel(meeting),
      scheduleByLabel: reviewScheduleByLabel(meeting),
      summary,
      cancelled,
      hasPrescription: Array.isArray(assignment?.items) && assignment.items.length > 0,
    };
  });
}

function isCompletedCounsellingMeeting(meeting) {
  if (!meeting) return false;
  if (meeting.cancelled || String(meeting.reviewStatus || "").toLowerCase() === "cancelled") {
    return false;
  }
  const session = String(meeting.sessionStatus || "").toLowerCase();
  if (session === "complete") return true;
  if (session === "cancel" || session === "pending") return false;
  const trackStatus = String(meeting.trackStatus || "").toLowerCase();
  if (trackStatus === "completed" || trackStatus === "follow_up_needed") return true;
  if (String(meeting.reviewStatus || "").toLowerCase() === "active" && meeting.completedAt) {
    return true;
  }
  if (String(meeting.reviewStatus || "").toLowerCase() === "active" && meeting.date && !meeting.scheduledAt) {
    return true;
  }
  return false;
}

/** Most recent completed counselling / wellness review (not in-progress or scheduled-only sessions). */
export function latestCounsellingLabel(tracks, meetings) {
  const candidates = [];

  for (const track of Array.isArray(tracks) ? tracks : []) {
    const status = String(track?.status || "").toLowerCase();
    if (status === "completed" || status === "follow_up_needed") {
      const raw = track.updatedAt || track.scheduledAt;
      pushCandidate(candidates, raw, formatCounsellingDateTime(raw));
    }
  }

  for (const meeting of Array.isArray(meetings) ? meetings : []) {
    if (!isCompletedCounsellingMeeting(meeting)) continue;
    const raw =
      meeting.completedAt
      || meeting.scheduledAt
      || (meeting.date ? `${calendarDayFrom(meeting.date)}T12:00:00+05:30` : null);
    if (!raw) continue;
    const label = meeting.completedAt || meeting.scheduledAt
      ? formatCounsellingDateTime(raw)
      : formatCounsellingReviewDay(meeting.date);
    pushCandidate(candidates, raw, label);
  }

  candidates.sort((a, b) => b.at - a.at);
  return candidates[0]?.label || "";
}

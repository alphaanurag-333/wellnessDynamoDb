const TERMINAL_TRACK_STATUSES = new Set(["completed", "cancelled", "follow_up_needed"]);
const STAFF_INITIATOR_ROLES = new Set([
  "admin",
  "wellness_coach",
  "assistant_wellness_coach",
  "trainee",
]);

function calendarDayFrom(value) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function normalizeInitiatedBy(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "client" || raw === "user") return "client";
  if (raw === "coach" || raw === "staff") return "coach";
  return null;
}

/** Who started the counselling flow — persisted on new tracks; inferred for older rows. */
function resolveCounsellingInitiatedBy(track) {
  const stored = normalizeInitiatedBy(track?.initiatedByRole);
  if (stored) return stored;

  const status = String(track?.status || "").toLowerCase();
  const updatedByRole = String(track?.statusUpdatedByRole || "").toLowerCase();
  if (STAFF_INITIATOR_ROLES.has(updatedByRole)) return "coach";
  if (status !== "requested") return "coach";
  if (Array.isArray(track?.periodOffers) && track.periodOffers.length) return "coach";
  if (track?.scheduledAt) return "coach";
  return "client";
}

function resolveGenericInitiatedByLabel(staffRole) {
  const role = String(staffRole || "").trim().toLowerCase();
  if (role === "client" || role === "user") return "Self";
  if (role === "admin") return "Admin";
  if (role === "assistant_wellness_coach") return "AWC";
  if (
    role === "wellness_coach"
    || role === "coach"
    || role === "trainee"
    || role === "staff"
  ) {
    return "Coach";
  }
  return "Coach";
}

function resolveStaffInitiatorRole({ track, meeting, initiatedByRole }) {
  if (initiatedByRole === "client") return "client";

  const fromMeeting = String(meeting?.authorRole || meeting?.createdByRole || "").trim().toLowerCase();
  if (fromMeeting) return fromMeeting;

  const updatedBy = String(track?.statusUpdatedByRole || "").trim().toLowerCase();
  if (STAFF_INITIATOR_ROLES.has(updatedBy)) return updatedBy;

  const assignedType = String(track?.assignedCoachType || "").trim().toLowerCase();
  if (assignedType === "assistant_wellness_coach") return "assistant_wellness_coach";

  return "wellness_coach";
}

function resolvePublicInitiatedByRole({ track, meeting, initiatedByRole }) {
  if (initiatedByRole === "client") return "client";
  const staffRole = resolveStaffInitiatorRole({ track, meeting, initiatedByRole });
  if (staffRole === "admin") return "admin";
  if (staffRole === "assistant_wellness_coach") return "assistant_wellness_coach";
  return "coach";
}

function resolveInitiatedByDisplayName(initiatedByRole, { targetUser, track, meeting, staffNameMap, genericInitiatorLabels } = {}) {
  if (genericInitiatorLabels) {
    const staffRole = resolveStaffInitiatorRole({ track, meeting, initiatedByRole });
    return resolveGenericInitiatedByLabel(staffRole);
  }
  if (initiatedByRole === "client") {
    return String(targetUser?.name || "").trim() || "Client";
  }

  const fromAuthor = String(meeting?.authorName || "").trim();
  if (fromAuthor) return fromAuthor;

  for (const id of [track?.assignedCoachId, track?.parentCoachId, track?.statusUpdatedById]) {
    const key = String(id || "").trim();
    if (!key) continue;
    const name = staffNameMap?.get?.(key);
    if (name) return name;
  }

  const fromProfile =
    String(targetUser?.assignedCoach?.name || "").trim()
    || String(targetUser?.parentCoach?.name || "").trim();
  if (fromProfile) return fromProfile;

  return "Coach";
}

function resolveCounsellingSessionStatus({ reviewStatus, trackStatus, cancelled, completedDate, scheduledAt } = {}) {
  const rxStatus = String(reviewStatus || "").toLowerCase();
  const trStatus = String(trackStatus || "").toLowerCase();

  if (cancelled || rxStatus === "cancelled" || trStatus === "cancelled") {
    return "cancel";
  }
  if (trStatus === "completed" || trStatus === "follow_up_needed") {
    return "complete";
  }
  if (rxStatus === "active" && completedDate) {
    return "complete";
  }
  if (trStatus === "scheduled" && scheduledAt) {
    const at = new Date(scheduledAt).getTime();
    if (!Number.isNaN(at) && at <= Date.now()) {
      return "pending";
    }
  }
  if (trStatus && !TERMINAL_TRACK_STATUSES.has(trStatus)) {
    return "pending";
  }
  if (rxStatus === "active") {
    return "complete";
  }
  return "pending";
}

function attachCounsellingSessionMeta(meeting, { track, initiatorContext } = {}) {
  if (!meeting) return meeting;
  const counsellingInitiator = track ? resolveCounsellingInitiatedBy(track) : "coach";
  const initiatedByRole = resolvePublicInitiatedByRole({
    track,
    meeting,
    initiatedByRole: counsellingInitiator,
  });
  const initiatedBy = resolveInitiatedByDisplayName(counsellingInitiator, {
    targetUser: initiatorContext?.targetUser,
    track,
    meeting,
    staffNameMap: initiatorContext?.staffNameMap,
    genericInitiatorLabels: initiatorContext?.genericInitiatorLabels,
  });
  const sessionStatus = resolveCounsellingSessionStatus({
    reviewStatus: meeting.reviewStatus,
    trackStatus: track?.status || meeting.trackStatus,
    cancelled: meeting.cancelled,
    completedDate: meeting.completedDate,
    scheduledAt: meeting.scheduledAt || track?.scheduledAt,
  });
  return {
    ...meeting,
    initiatedBy,
    initiatedByRole,
    sessionStatus,
  };
}

/** Prescription reviews plus completed/cancelled sessions that are not tied to a review day. */
function mergeMeetingsWithOrphanTracks(meetings, tracks, initiatorContext) {
  const rows = (Array.isArray(meetings) ? meetings : []).map((row) =>
    attachCounsellingSessionMeta(row, { initiatorContext }),
  );
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

    const meeting = attachCounsellingSessionMeta(
      {
        id: trackId || `track-${date || status}`,
        date: date || "",
        reviewStatus: status === "cancelled" ? "cancelled" : "active",
        summary: String(track.concern || "").trim(),
        authorName: "",
        cancelled: status === "cancelled",
        trackStatus: status,
        scheduledDate: calendarDayFrom(track.scheduledAt),
        scheduledAt: track.scheduledAt || null,
        completedDate:
          status === "completed" || status === "follow_up_needed"
            ? calendarDayFrom(track.updatedAt || track.scheduledAt)
            : null,
        completedAt:
          status === "completed" || status === "follow_up_needed"
            ? (track.updatedAt || track.scheduledAt || null)
            : null,
        cancelledDate: status === "cancelled" ? calendarDayFrom(track.updatedAt) : null,
        cancelledAt: status === "cancelled" ? (track.updatedAt || null) : null,
      },
      { track, initiatorContext },
    );
    rows.push(meeting);
    if (date) coveredDays.add(date);
    if (trackId) coveredIds.add(trackId);
  }

  return rows.sort(
    (a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)),
  );
}

/** Include in-progress counselling requests/sessions for mobile history. */
function appendActiveCounsellingTracks(meetings, tracks, initiatorContext) {
  const rows = Array.isArray(meetings) ? [...meetings] : [];
  const coveredIds = new Set(rows.map((row) => String(row.id || "")).filter(Boolean));

  for (const track of Array.isArray(tracks) ? tracks : []) {
    const status = String(track?.status || "").toLowerCase();
    if (TERMINAL_TRACK_STATUSES.has(status)) continue;

    const trackId = String(track.id || "").trim();
    if (trackId && coveredIds.has(trackId)) continue;

    const date =
      calendarDayFrom(track.scheduledAt)
      || calendarDayFrom(track.selectedDate)
      || calendarDayFrom(track.createdAt)
      || "";

    rows.push(
      attachCounsellingSessionMeta(
        {
          id: trackId || `track-active-${status}`,
          date,
          reviewStatus: "active",
          summary: String(track.concern || "").trim(),
          authorName: "",
          cancelled: false,
          trackStatus: status,
          scheduledDate: calendarDayFrom(track.scheduledAt),
          scheduledAt: track.scheduledAt || null,
          completedDate: null,
          completedAt: null,
          cancelledDate: null,
          cancelledAt: null,
        },
        { track, initiatorContext },
      ),
    );
    if (trackId) coveredIds.add(trackId);
  }

  return rows.sort(
    (a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)),
  );
}

function pickConsultancyTrackForReviewDay(reviewDay, tracks) {
  if (!reviewDay) return null;
  const list = Array.isArray(tracks) ? tracks : [];
  const matched = list.filter((track) => {
    if (calendarDayFrom(track?.scheduledAt) === reviewDay) return true;
    if (calendarDayFrom(track?.selectedDate) === reviewDay) return true;
    return false;
  });
  if (!matched.length) return null;
  return matched.sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
  )[0];
}

function buildUserCounsellingReviewHistory({ assignments, meetings, tracks, initiatorContext }) {
  const merged = mergeMeetingsWithOrphanTracks(meetings, tracks, initiatorContext);
  const sessions = appendActiveCounsellingTracks(merged, tracks, initiatorContext);
  const trackList = Array.isArray(tracks) ? tracks : [];

  const reviews = (Array.isArray(assignments) ? assignments : []).map((row) => {
    const reviewDay = calendarDayFrom(row?.date || row?.reviewAt);
    const track = pickConsultancyTrackForReviewDay(reviewDay, trackList);
    return attachCounsellingSessionMeta(
      {
        ...row,
        cancelled: String(row.reviewStatus || "active").toLowerCase() === "cancelled",
        trackStatus: track?.status || null,
      },
      { track, initiatorContext },
    );
  });

  return { reviews, meetings: sessions, sessions };
}

function collectStaffIdsFromTracks(tracks = []) {
  const ids = new Set();
  for (const track of Array.isArray(tracks) ? tracks : []) {
    for (const id of [track?.parentCoachId, track?.assignedCoachId, track?.statusUpdatedById]) {
      const key = String(id || "").trim();
      if (key) ids.add(key);
    }
  }
  return [...ids];
}

module.exports = {
  calendarDayFrom,
  normalizeInitiatedBy,
  resolveCounsellingInitiatedBy,
  resolveGenericInitiatedByLabel,
  resolveStaffInitiatorRole,
  resolvePublicInitiatedByRole,
  resolveInitiatedByDisplayName,
  resolveCounsellingSessionStatus,
  attachCounsellingSessionMeta,
  collectStaffIdsFromTracks,
  mergeMeetingsWithOrphanTracks,
  appendActiveCounsellingTracks,
  buildUserCounsellingReviewHistory,
};

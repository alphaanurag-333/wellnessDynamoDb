const AppError = require("../utils/AppError");
const { getUserById } = require("../models/userModel");
const {
  getHealConsultancyTrackById,
  normalizeTrackStatus,
  MAX_CONCERN_LENGTH,
  MAX_NOTES_LENGTH,
} = require("../models/userHealConsultancyTrackModel");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  handleValidationError,
} = require("./reminderControllerHelpers");
const { assertHealTierUser } = require("./dietPlanControllerHelpers");

function readPagination(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  return { page, limit };
}

function parseConcernField(body = {}) {
  const concern = body.concern ?? body.healthConcern ?? body.notes;
  if (!String(concern || "").trim()) {
    throw new AppError("concern is required", 400);
  }
  if (String(concern).trim().length > MAX_CONCERN_LENGTH) {
    throw new AppError(`concern must be at most ${MAX_CONCERN_LENGTH} characters`, 400);
  }
  return String(concern).trim();
}

function parseOptionalScheduledAt(body = {}) {
  const raw = body.scheduledAt ?? body.scheduled_at ?? null;
  if (raw == null || raw === "") return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("scheduledAt must be a valid date", 400);
  }
  return date.toISOString();
}

function parseOptionalMeetingLink(body = {}) {
  if (body.meetingLink === undefined && body.meeting_link === undefined) return null;
  return String(body.meetingLink ?? body.meeting_link ?? "").trim() || null;
}

function parseOptionalCoachNotes(body = {}) {
  if (body.coachNotes === undefined && body.coach_notes === undefined) return null;
  const notes = String(body.coachNotes ?? body.coach_notes ?? "").trim();
  if (notes.length > MAX_NOTES_LENGTH) {
    throw new AppError(`coachNotes must be at most ${MAX_NOTES_LENGTH} characters`, 400);
  }
  return notes || null;
}

function parseCreateBody(body = {}) {
  return {
    concern: parseConcernField(body),
    scheduledAt: parseOptionalScheduledAt(body),
  };
}

function parseCoachCreateBody(body = {}) {
  const status = body.status ?? body.consultancyStatus ?? body.consultancy_status ?? "scheduled";
  const normalized = normalizeTrackStatus(status);
  if (!normalized) throw new AppError("Invalid consultancy status", 400);

  return {
    concern: parseConcernField(body),
    status: normalized,
    scheduledAt: parseOptionalScheduledAt(body),
    meetingLink: parseOptionalMeetingLink(body),
    coachNotes: parseOptionalCoachNotes(body),
  };
}

function parseStatusUpdateBody(body = {}) {
  const updates = {};
  const status = body.status ?? body.consultancyStatus ?? body.consultancy_status;
  if (status != null) {
    const normalized = normalizeTrackStatus(status);
    if (!normalized) throw new AppError("Invalid consultancy status", 400);
    updates.status = normalized;
  }

  if (body.scheduledAt !== undefined || body.scheduled_at !== undefined) {
    const raw = body.scheduledAt ?? body.scheduled_at ?? null;
    if (raw == null || raw === "") {
      updates.scheduledAt = null;
    } else {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) {
        throw new AppError("scheduledAt must be a valid date", 400);
      }
      updates.scheduledAt = date.toISOString();
    }
  }
  if (body.meetingLink !== undefined || body.meeting_link !== undefined) {
    updates.meetingLink = String(body.meetingLink ?? body.meeting_link ?? "").trim() || null;
  }
  if (body.coachNotes !== undefined || body.coach_notes !== undefined) {
    const notes = String(body.coachNotes ?? body.coach_notes ?? "").trim();
    if (notes.length > MAX_NOTES_LENGTH) {
      throw new AppError(`coachNotes must be at most ${MAX_NOTES_LENGTH} characters`, 400);
    }
    updates.coachNotes = notes || null;
  }

  if (!Object.keys(updates).length) {
    throw new AppError("At least one field is required for update", 400);
  }

  return updates;
}

async function loadHealUser(userId) {
  const user = await loadTargetUser(userId);
  assertHealTierUser(user);
  return user;
}

async function loadTrackForUser(trackId, userId) {
  const track = await getHealConsultancyTrackById(trackId);
  if (!track || String(track.userId) !== String(userId)) {
    throw new AppError("Consultancy track not found", 404);
  }
  return track;
}

function resolveCoachHierarchy(user) {
  const parentCoachId = String(user.parentCoachId || "").trim();
  if (!parentCoachId) {
    throw new AppError("User does not have an assigned coach hierarchy", 400);
  }
  return {
    parentCoachId,
    assignedCoachId: user.assignedCoachId ? String(user.assignedCoachId) : null,
    assignedCoachType: user.assignedCoachType ? String(user.assignedCoachType) : null,
  };
}

module.exports = {
  readUserIdParam,
  readPagination,
  parseCreateBody,
  parseCoachCreateBody,
  parseStatusUpdateBody,
  loadHealUser,
  loadTrackForUser,
  resolveCoachHierarchy,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  handleValidationError,
  assertHealTierUser,
};

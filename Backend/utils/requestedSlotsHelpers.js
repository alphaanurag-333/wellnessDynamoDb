const { v4: uuidv4 } = require("uuid");

const MAX_REQUESTED_SLOTS = 4;

function parseIsoDate(value, fieldName) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const err = new Error(`${fieldName} must be a valid date`);
    err.name = "ValidationError";
    throw err;
  }
  return date.toISOString();
}

function normalizeSlots(rawSlots) {
  if (!Array.isArray(rawSlots) || !rawSlots.length) {
    const err = new Error("At least one slot is required");
    err.name = "ValidationError";
    throw err;
  }
  return rawSlots.map((slot, index) => {
    const startAt = parseIsoDate(slot.startAt || slot.start_at, `slots[${index}].startAt`);
    const endAt = parseIsoDate(slot.endAt || slot.end_at, `slots[${index}].endAt`);
    if (!startAt || !endAt) {
      const err = new Error(`slots[${index}] requires startAt and endAt`);
      err.name = "ValidationError";
      throw err;
    }
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      const err = new Error(`slots[${index}] endAt must be after startAt`);
      err.name = "ValidationError";
      throw err;
    }
    if (new Date(startAt).getTime() <= Date.now()) {
      const err = new Error(`slots[${index}].startAt must be in the future`);
      err.name = "ValidationError";
      throw err;
    }
    return {
      id: String(slot.id || uuidv4()),
      startAt,
      endAt,
    };
  });
}

/**
 * Normalize user-proposed alternate times (1–4).
 * Accepts `slots` array, or legacy single `{ startAt, endAt }` / body fields.
 */
function normalizeRequestedSlots(raw, { startAt, endAt } = {}) {
  let list = Array.isArray(raw) ? raw : null;
  if (!list || !list.length) {
    if (startAt && endAt) {
      list = [{ startAt, endAt }];
    } else {
      const err = new Error("At least one requested time slot is required");
      err.name = "ValidationError";
      throw err;
    }
  }
  if (list.length > MAX_REQUESTED_SLOTS) {
    const err = new Error(`At most ${MAX_REQUESTED_SLOTS} requested time slots are allowed`);
    err.name = "ValidationError";
    throw err;
  }
  return normalizeSlots(list);
}

function resolveRequestedSlots(item) {
  if (!item) return [];
  if (Array.isArray(item.requestedSlots) && item.requestedSlots.length) {
    return item.requestedSlots;
  }
  if (item.requestedStartAt && item.requestedEndAt) {
    return [
      {
        id: "legacy",
        startAt: item.requestedStartAt,
        endAt: item.requestedEndAt,
      },
    ];
  }
  return [];
}

function mirrorRequestedSlots(requestedSlots) {
  const slots = Array.isArray(requestedSlots) ? requestedSlots : [];
  const first = slots[0] || null;
  return {
    requestedSlots: slots,
    requestedStartAt: first?.startAt || null,
    requestedEndAt: first?.endAt || null,
  };
}

function durationFromRange(startAt, endAt, fallbackMinutes = 45) {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return Number(fallbackMinutes) || 45;
  }
  return Math.max(15, Math.round((end - start) / 60000));
}

function pickRequestedSlot(requestedSlots, body = {}) {
  const slots = Array.isArray(requestedSlots) ? requestedSlots : [];
  if (!slots.length) return null;

  const requestedSlotId = String(body.requestedSlotId || body.slotId || "").trim();
  const bodyStartAt = String(body.startAt || body.requestedStartAt || "").trim();
  const bodyEndAt = String(body.endAt || body.requestedEndAt || "").trim();

  const sameInstant = (a, b) => {
    const ta = new Date(a).getTime();
    const tb = new Date(b).getTime();
    return Number.isFinite(ta) && Number.isFinite(tb) && ta === tb;
  };

  let chosen = requestedSlotId
    ? slots.find((s) => String(s.id) === requestedSlotId)
    : null;

  if (!chosen && bodyStartAt) {
    chosen = slots.find(
      (s) =>
        sameInstant(s.startAt, bodyStartAt) &&
        (!bodyEndAt || sameInstant(s.endAt, bodyEndAt)),
    );
  }

  if (!chosen && slots.length === 1) {
    chosen = slots[0];
  }

  return chosen || null;
}

module.exports = {
  MAX_REQUESTED_SLOTS,
  parseIsoDate,
  normalizeSlots,
  normalizeRequestedSlots,
  resolveRequestedSlots,
  mirrorRequestedSlots,
  durationFromRange,
  pickRequestedSlot,
};

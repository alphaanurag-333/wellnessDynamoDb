const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { deleteStoredMedia } = require("../../utils/s3");
const { readProfileImageKey } = require("../../utils/mediaFieldAliases");
const {
  getClientTestimonialById,
  getClientTestimonialRecordById,
  updateClientTestimonial,
  deleteClientTestimonial,
  listClientTestimonials,
  normalizeStatus,
} = require("../../models/clientTestimonials");

const { resolveStaffActor, getStaffScopeCoachId, assertStaffCanMutate } = require("../staffAccess");

const ALLOWED_STATUS = ["active", "inactive"];

function readIdParam(req) {
  return String(req.params.id || req.params.testimonialId || "").trim();
}

async function deleteOwnedTestimonialImage(profileImageKey) {
  const key = String(profileImageKey || "").trim();
  if (!key || !key.startsWith("client-testimonials/")) return;
  await deleteStoredMedia(key);
}

function assertCoachScope(record, { coachId, assistantId } = {}) {
  const managedByCoachId = String(record?.managedByCoachId || "").trim();
  const assignedCoachType = String(record?.assignedCoachType || "").trim();
  const assignedCoachId = String(record?.assignedCoachId || "").trim();

  if (assistantId) {
    if (
      assignedCoachType === "assistant_wellness_coach" &&
      assignedCoachId === String(assistantId)
    ) {
      return;
    }
    throw new AppError("Testimonial is not assigned to you", 403);
  }

  if (coachId && managedByCoachId === String(coachId)) return;
  throw new AppError("Testimonial is not under your coaching hierarchy", 403);
}

function assertStaffTestimonialScope(req, record) {
  const actor = resolveStaffActor(req);
  if (actor.role === "admin" || actor.role === "support") return actor;
  if (actor.role === "wellness_coach") {
    assertCoachScope(record, { coachId: actor.id });
    return actor;
  }
  if (actor.role === "trainee") {
    assertCoachScope(record, { coachId: actor.parentCoachId });
    return actor;
  }
  if (actor.role === "assistant_wellness_coach") {
    assertCoachScope(record, { assistantId: actor.id });
    return actor;
  }
  throw new AppError("Forbidden", 403);
}

function paginateRows(rows, page, limit) {
  const lim = Math.max(1, Number(limit) || 20);
  const pg = Math.max(1, Number(page) || 1);
  const start = (pg - 1) * lim;
  return {
    rows: rows.slice(start, start + lim),
    pagination: {
      page: pg,
      limit: lim,
      total: rows.length,
      pages: Math.max(1, Math.ceil(rows.length / lim)),
    },
  };
}

function buildContentUpdates(body) {
  const updates = {};
  if (body.description !== undefined || body.review !== undefined) {
    const description = String(body.description ?? body.review ?? "").trim();
    if (!description) throw new AppError("description cannot be empty", 400);
    updates.description = description;
  }
  if (body.rating !== undefined || body.stars !== undefined) {
    const rating = Number(body.rating ?? body.stars);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new AppError("rating must be a number between 1 and 5", 400);
    }
    updates.rating = Math.round(rating);
  }
  if (body.status !== undefined) {
    const status = String(body.status || "").trim().toLowerCase();
    if (!ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = normalizeStatus(status);
  }
  return updates;
}

exports.listCoachClientTestimonialsController = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);
  const { page = 1, limit = 20, status, search } = req.query;
  const data = await listClientTestimonials({
    page: actor.role === "assistant_wellness_coach" ? 1 : page,
    limit: actor.role === "assistant_wellness_coach" ? 200 : limit,
    status,
    search,
    managedByCoachId: actor.role === "admin" || actor.role === "support" ? undefined : getStaffScopeCoachId(req),
  });

  let rows = data.clientTestimonials;
  if (actor.role === "assistant_wellness_coach") {
    rows = (rows || []).filter(
      (row) =>
        String(row.assignedCoachType || "") === "assistant_wellness_coach" &&
        String(row.assignedCoachId || "") === String(actor.id)
    );
    const paged = paginateRows(rows, page, limit);
    return res.status(200).json({
      status: true,
      clientTestimonials: paged.rows,
      pagination: paged.pagination,
    });
  }

  return res.status(200).json({
    status: true,
    clientTestimonials: data.clientTestimonials,
    pagination: data.pagination,
  });
});

exports.listCoachPendingClientTestimonialsController = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);
  const data = await listClientTestimonials({
    page: 1,
    limit: 200,
    status: "inactive",
    managedByCoachId: actor.role === "admin" || actor.role === "support" ? undefined : getStaffScopeCoachId(req),
  });

  let rows = data.clientTestimonials || [];
  if (actor.role === "assistant_wellness_coach") {
    rows = rows.filter(
      (row) =>
        String(row.assignedCoachType || "") === "assistant_wellness_coach" &&
        String(row.assignedCoachId || "") === String(actor.id)
    );
  }

  return res.status(200).json({
    status: true,
    clientTestimonials: rows,
    total: rows.length,
  });
});

exports.getCoachClientTestimonialByIdController = asyncHandler(async (req, res) => {
  const record = await getClientTestimonialRecordById(readIdParam(req));
  if (!record) throw new AppError("Client testimonial not found", 404);
  assertStaffTestimonialScope(req, record);

  const clientTestimonial = await getClientTestimonialById(record.id);
  return res.status(200).json({ status: true, clientTestimonial });
});

exports.updateCoachClientTestimonialController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const id = readIdParam(req);
  const current = await getClientTestimonialRecordById(id);
  if (!current) throw new AppError("Client testimonial not found", 404);
  assertStaffTestimonialScope(req, current);

  const updates = buildContentUpdates(req.body);
  if (Object.keys(updates).length === 0) {
    throw new AppError("Only description, rating, and status can be updated", 400);
  }

  const clientTestimonial = await updateClientTestimonial(id, updates);
  return res.status(200).json({
    status: true,
    message: "Client testimonial updated successfully",
    clientTestimonial,
  });
});

exports.deleteCoachClientTestimonialController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const id = readIdParam(req);
  const current = await getClientTestimonialRecordById(id);
  if (!current) throw new AppError("Client testimonial not found", 404);
  assertStaffTestimonialScope(req, current);

  await deleteOwnedTestimonialImage(readProfileImageKey(current));
  await deleteClientTestimonial(id);

  return res.status(200).json({
    status: true,
    message: "Client testimonial deleted successfully",
  });
});

exports.listAssistantClientTestimonialsController = exports.listCoachClientTestimonialsController;
exports.listAssistantPendingClientTestimonialsController = exports.listCoachPendingClientTestimonialsController;
exports.getAssistantClientTestimonialByIdController = exports.getCoachClientTestimonialByIdController;
exports.updateAssistantClientTestimonialController = exports.updateCoachClientTestimonialController;
exports.deleteAssistantClientTestimonialController = exports.deleteCoachClientTestimonialController;

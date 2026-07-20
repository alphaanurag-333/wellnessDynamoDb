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

function filterForAssistant(rows, assistantId) {
  return (rows || []).filter(
    (row) =>
      String(row.assignedCoachType || "") === "assistant_wellness_coach" &&
      String(row.assignedCoachId || "") === String(assistantId)
  );
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
  const coachId = req.auth?.sub;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const { page = 1, limit = 20, status, search } = req.query;
  const data = await listClientTestimonials({
    page,
    limit,
    status,
    search,
    managedByCoachId: coachId,
  });

  return res.status(200).json({
    status: true,
    clientTestimonials: data.clientTestimonials,
    pagination: data.pagination,
  });
});

exports.listCoachPendingClientTestimonialsController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const data = await listClientTestimonials({
    page: 1,
    limit: 100,
    status: "inactive",
    managedByCoachId: coachId,
  });

  return res.status(200).json({
    status: true,
    clientTestimonials: data.clientTestimonials,
    total: data.clientTestimonials.length,
  });
});

exports.getCoachClientTestimonialByIdController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const record = await getClientTestimonialRecordById(readIdParam(req));
  if (!record) throw new AppError("Client testimonial not found", 404);
  assertCoachScope(record, { coachId });

  const clientTestimonial = await getClientTestimonialById(record.id);
  return res.status(200).json({ status: true, clientTestimonial });
});

exports.updateCoachClientTestimonialController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const current = await getClientTestimonialRecordById(id);
  if (!current) throw new AppError("Client testimonial not found", 404);
  assertCoachScope(current, { coachId });

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
  const coachId = req.auth?.sub;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const current = await getClientTestimonialRecordById(id);
  if (!current) throw new AppError("Client testimonial not found", 404);
  assertCoachScope(current, { coachId });

  await deleteOwnedTestimonialImage(readProfileImageKey(current));
  await deleteClientTestimonial(id);

  return res.status(200).json({
    status: true,
    message: "Client testimonial deleted successfully",
  });
});

exports.listAssistantClientTestimonialsController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const parentCoachId = String(req.user?.wellnessCoachId || "").trim();
  if (!parentCoachId) throw new AppError("Assistant coach hierarchy not found", 403);

  const { page = 1, limit = 20, status, search } = req.query;
  const data = await listClientTestimonials({
    page: 1,
    limit: 200,
    status,
    search,
    managedByCoachId: parentCoachId,
  });

  const filtered = filterForAssistant(data.clientTestimonials, assistantId);
  const lim = Math.max(1, Number(limit) || 20);
  const pg = Math.max(1, Number(page) || 1);
  const start = (pg - 1) * lim;
  const slice = filtered.slice(start, start + lim);

  return res.status(200).json({
    status: true,
    clientTestimonials: slice,
    pagination: {
      page: pg,
      limit: lim,
      total: filtered.length,
      pages: Math.max(1, Math.ceil(filtered.length / lim)),
    },
  });
});

exports.listAssistantPendingClientTestimonialsController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const parentCoachId = String(req.user?.wellnessCoachId || "").trim();
  if (!parentCoachId) throw new AppError("Assistant coach hierarchy not found", 403);

  const data = await listClientTestimonials({
    page: 1,
    limit: 100,
    status: "inactive",
    managedByCoachId: parentCoachId,
  });

  const filtered = filterForAssistant(data.clientTestimonials, assistantId);

  return res.status(200).json({
    status: true,
    clientTestimonials: filtered,
    total: filtered.length,
  });
});

exports.getAssistantClientTestimonialByIdController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const record = await getClientTestimonialRecordById(readIdParam(req));
  if (!record) throw new AppError("Client testimonial not found", 404);
  assertCoachScope(record, { assistantId });

  const clientTestimonial = await getClientTestimonialById(record.id);
  return res.status(200).json({ status: true, clientTestimonial });
});

exports.updateAssistantClientTestimonialController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const current = await getClientTestimonialRecordById(id);
  if (!current) throw new AppError("Client testimonial not found", 404);
  assertCoachScope(current, { assistantId });

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

exports.deleteAssistantClientTestimonialController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const current = await getClientTestimonialRecordById(id);
  if (!current) throw new AppError("Client testimonial not found", 404);
  assertCoachScope(current, { assistantId });

  await deleteOwnedTestimonialImage(readProfileImageKey(current));
  await deleteClientTestimonial(id);

  return res.status(200).json({
    status: true,
    message: "Client testimonial deleted successfully",
  });
});

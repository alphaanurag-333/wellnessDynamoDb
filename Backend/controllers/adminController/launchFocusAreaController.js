const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createLaunchFocusArea,
  getLaunchFocusAreaById,
  getLaunchFocusAreaRecordById,
  updateLaunchFocusArea,
  deleteLaunchFocusArea,
  listLaunchFocusAreas,
  LAUNCH_FOCUS_AREA_ALLOWED_STATUS,
} = require("../../models/launchFocusAreaModel");

const TITLE_MAX_LEN = 300;

exports.listLaunchFocusAreasController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const data = await listLaunchFocusAreas({ page, limit, status, search });
  return res.status(200).json({ status: true, focusAreas: data.focusAreas, pagination: data.pagination });
});

exports.getLaunchFocusAreaByIdController = asyncHandler(async (req, res) => {
  const focusArea = await getLaunchFocusAreaById(req.params.id);
  if (!focusArea) throw new AppError("Area to focus not found", 404);
  return res.status(200).json({ status: true, focusArea });
});

exports.createLaunchFocusAreaController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const status = String(req.body.status || "active").trim().toLowerCase();

  if (!title) throw new AppError("title is required", 400);
  if (title.length > TITLE_MAX_LEN) throw new AppError(`title cannot exceed ${TITLE_MAX_LEN} characters`, 400);
  if (!LAUNCH_FOCUS_AREA_ALLOWED_STATUS.includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  const focusArea = await createLaunchFocusArea({
    title,
    sortOrder: req.body.sortOrder,
    status,
  });

  return res.status(201).json({
    status: true,
    message: "Area to focus created successfully",
    focusArea,
  });
});

exports.updateLaunchFocusAreaController = asyncHandler(async (req, res) => {
  const current = await getLaunchFocusAreaRecordById(req.params.id);
  if (!current) throw new AppError("Area to focus not found", 404);

  const updates = {};
  if (req.body.title !== undefined) {
    const title = String(req.body.title || "").trim();
    if (!title) throw new AppError("title cannot be empty", 400);
    if (title.length > TITLE_MAX_LEN) throw new AppError(`title cannot exceed ${TITLE_MAX_LEN} characters`, 400);
    updates.title = title;
  }
  if (req.body.sortOrder !== undefined) updates.sortOrder = req.body.sortOrder;
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!LAUNCH_FOCUS_AREA_ALLOWED_STATUS.includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let focusArea;
  try {
    focusArea = await updateLaunchFocusArea(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Area to focus not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Area to focus updated successfully",
    focusArea,
  });
});

exports.deleteLaunchFocusAreaController = asyncHandler(async (req, res) => {
  const current = await getLaunchFocusAreaRecordById(req.params.id);
  if (!current) throw new AppError("Area to focus not found", 404);

  try {
    await deleteLaunchFocusArea(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Area to focus not found", 404);
    }
    throw err;
  }

  return res.status(200).json({ status: true, message: "Area to focus deleted successfully" });
});

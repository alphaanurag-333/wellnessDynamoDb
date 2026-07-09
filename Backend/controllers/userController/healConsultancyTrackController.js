const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createHealConsultancyTrack,
  listHealConsultancyTracksByUserId,
  toPublicHealConsultancyTrack,
} = require("../../models/userHealConsultancyTrackModel");
const {
  readPagination,
  parseCreateBody,
  resolveCoachHierarchy,
  handleValidationError,
} = require("../healConsultancyTrackControllerHelpers");

exports.createMyHealConsultancyTrackController = asyncHandler(async (req, res) => {
  const user = req.currentUser;
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const body = parseCreateBody(req.body || {});
  const hierarchy = resolveCoachHierarchy(user);

  let track;
  try {
    track = await createHealConsultancyTrack({
      userId,
      parentCoachId: hierarchy.parentCoachId,
      assignedCoachId: hierarchy.assignedCoachId,
      assignedCoachType: hierarchy.assignedCoachType,
      concern: body.concern,
      scheduledAt: body.scheduledAt,
      status: "requested",
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Consultancy request created",
    data: { track: toPublicHealConsultancyTrack(track) },
  });
});

exports.listMyHealConsultancyTracksController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const { page, limit } = readPagination(req);
  const status = req.query.status || req.query.consultancyStatus || null;
  const result = await listHealConsultancyTracksByUserId(userId, { page, limit, status });

  return res.status(200).json({
    status: true,
    message: "Consultancy tracks fetched",
    data: {
      tracks: result.items.map(toPublicHealConsultancyTrack),
      pagination: result.pagination,
    },
  });
});

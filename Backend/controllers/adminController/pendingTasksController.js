const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { resolveStaffActor } = require("../staffAccess");
const { getPendingTasks } = require("../../services/pendingTasksService");

exports.listPendingTasksController = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);
  let queues;
  try {
    queues = await getPendingTasks(actor);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(err.message || "Failed to load pending tasks", 400);
  }

  return res.status(200).json({
    status: true,
    message: "Pending tasks fetched successfully",
    queues,
  });
});

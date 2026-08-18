const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  isValidYoutubeUrl,
  fetchYoutubeDuration,
} = require("../../utils/wellnessLibraryFields");

exports.previewYoutubeDurationController = asyncHandler(async (req, res) => {
  const url = String(req.query.url || req.query.ytLink || "").trim();
  if (!isValidYoutubeUrl(url)) throw new AppError("ytLink must be a valid YouTube URL", 400);
  const duration = await fetchYoutubeDuration(url);
  if (!duration) throw new AppError("Could not detect video time from this YouTube link", 422);
  return res.status(200).json({ status: true, duration });
});

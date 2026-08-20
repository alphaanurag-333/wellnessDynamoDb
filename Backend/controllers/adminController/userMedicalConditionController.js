const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById } = require("../../models/userModel");
const {
  getLatestMedicalConditionForUser,
  toPublicMedicalCondition,
} = require("../../models/userMedicalConditionModel");

exports.getUserMedicalConditionsAdminController = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  const medical = await getLatestMedicalConditionForUser(userId);

  return res.status(200).json({
    status: true,
    message: "User medical conditions fetched",
    medicalCondition: toPublicMedicalCondition(medical),
  });
});

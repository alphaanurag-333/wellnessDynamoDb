const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById } = require("../../models/userModel");
const {
  listProgramsByUserId,
  toPublicProgram,
} = require("../../models/energyExchangeProgramModel");
const {
  listSubscriptionsByUserId,
  toPublicSubscription,
} = require("../../models/energyExchangeSubscriptionModel");
const {
  getLatestBodyMeasurementForUser,
  toPublicBodyMeasurement,
} = require("../../models/userBodyMeasurementModel");
const {
  getLatestMedicalConditionForUser,
  toPublicMedicalCondition,
} = require("../../models/userMedicalConditionModel");

exports.getUserEnergyExchangeAdminController = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  const [programsResult, subsResult, body, medical] = await Promise.all([
    listProgramsByUserId(userId, { page: 1, limit: 50 }),
    listSubscriptionsByUserId(userId, { page: 1, limit: 200 }),
    getLatestBodyMeasurementForUser(userId),
    getLatestMedicalConditionForUser(userId),
  ]);

  return res.status(200).json({
    status: true,
    message: "User Energy Exchange detail fetched",
    data: {
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        userTier: user.userTier,
        energyExchangeEnabled: Boolean(user.energyExchangeEnabled),
        paidOnboardingCompleted: Boolean(user.paidOnboardingCompleted),
        paidOnboardingStep: user.paidOnboardingStep || null,
        healPaidAt: user.healPaidAt || null,
        dietaryPreference: user.dietaryPreference || null,
        wellnessJourneyFor: user.wellnessJourneyFor || null,
        addressLine1: user.addressLine1 || null,
        addressLine2: user.addressLine2 || null,
        pincode: user.pincode || null,
      },
      programs: programsResult.items.map(toPublicProgram),
      subscriptions: subsResult.items.map(toPublicSubscription),
      latestBodyMeasurement: toPublicBodyMeasurement(body),
      latestMedicalCondition: toPublicMedicalCondition(medical),
    },
  });
});

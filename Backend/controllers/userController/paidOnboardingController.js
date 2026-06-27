const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { uploadFileFromRequest } = require("../../utils/s3");
const {
  getUserById,
  updateUser,
  normalizeDietaryPreference,
  normalizeWellnessJourneyFor,
  USER_ALLOWED_DIETARY_PREFERENCES,
} = require("../../models/userModel");
const {
  buildUserUpdatesFromBody,
  enrichUser,
} = require("./userProfileHelpers");
const {
  createBodyMeasurement,
  getLatestBodyMeasurementForUser,
  toPublicBodyMeasurement,
} = require("../../models/userBodyMeasurementModel");
const {
  createMedicalCondition,
  getLatestMedicalConditionForUser,
  toPublicMedicalCondition,
} = require("../../models/userMedicalConditionModel");

function authedUserId(req) {
  return req.auth?.sub || req.user?.id;
}

exports.getStateController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  const [bodyMeasurement, medicalCondition] = await Promise.all([
    getLatestBodyMeasurementForUser(userId),
    getLatestMedicalConditionForUser(userId),
  ]);

  const enriched = await enrichUser(user);

  return res.status(200).json({
    status: true,
    message: "Paid onboarding state fetched",
    data: {
      paidOnboardingCompleted: Boolean(user.paidOnboardingCompleted),
      paidOnboardingStep: user.paidOnboardingStep || (user.paidOnboardingCompleted ? "done" : "register"),
      energyExchangeEnabled: Boolean(user.energyExchangeEnabled),
      healPaidAt: user.healPaidAt || null,
      prefill: {
        user: enriched,
        bodyMeasurement: toPublicBodyMeasurement(bodyMeasurement),
        medicalCondition: toPublicMedicalCondition(medicalCondition),
      },
    },
  });
});

exports.submitProfileController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const user = req.currentUser || (await getUserById(userId));
  if (!user) throw new AppError("User not found", 404);

  const body = req.body || {};

  const standardUpdates = await buildUserUpdatesFromBody(body, user, {
    allowStatus: false,
    req,
  });

  const extraUpdates = {};
  if (body.addressLine1 !== undefined || body.address_line1 !== undefined) {
    extraUpdates.addressLine1 = String(body.addressLine1 ?? body.address_line1 ?? "").trim() || null;
  }
  if (body.addressLine2 !== undefined || body.address_line2 !== undefined) {
    extraUpdates.addressLine2 = String(body.addressLine2 ?? body.address_line2 ?? "").trim() || null;
  }
  if (body.pincode !== undefined) {
    extraUpdates.pincode = String(body.pincode || "").trim() || null;
  }
  if (body.dietaryPreference !== undefined || body.dietary_preference !== undefined) {
    const dp = normalizeDietaryPreference(body.dietaryPreference ?? body.dietary_preference);
    if (!dp) {
      throw new AppError(
        `dietaryPreference must be one of: ${USER_ALLOWED_DIETARY_PREFERENCES.join(", ")}`,
        400
      );
    }
    extraUpdates.dietaryPreference = dp;
  }
  if (body.wellnessJourneyFor !== undefined || body.wellness_journey_for !== undefined) {
    extraUpdates.wellnessJourneyFor = normalizeWellnessJourneyFor(
      body.wellnessJourneyFor ?? body.wellness_journey_for
    );
  }

  const updates = {
    ...standardUpdates,
    ...extraUpdates,
    paidOnboardingStep: "body",
  };

  const updated = await updateUser(userId, updates);

  return res.status(200).json({
    status: true,
    message: "Profile saved. Continue with body measurements.",
    data: {
      user: await enrichUser(updated),
      paidOnboardingStep: "body",
    },
  });
});

exports.submitBodyMeasurementsController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const body = req.body || {};

  const weightPicKey = await uploadFileFromRequest(req, "users/body-measurements");

  const measurement = await createBodyMeasurement({
    userId,
    heightCm: body.heightCm ?? body.height_cm,
    heightUnit: body.heightUnit ?? body.height_unit,
    weightKg: body.weightKg ?? body.weight_kg,
    weightUnit: body.weightUnit ?? body.weight_unit,
    weightPicKey: weightPicKey || body.weightPicKey || body.weight_pic_key,
    neckCm: body.neckCm ?? body.neck_cm,
    shoulderCm: body.shoulderCm ?? body.shoulder_cm,
    chestCm: body.chestCm ?? body.chest_cm,
    waistCm: body.waistCm ?? body.waist_cm,
    hipCm: body.hipCm ?? body.hip_cm,
    thighsCm: body.thighsCm ?? body.thighs_cm,
    activityLevel: body.activityLevel ?? body.activity_level,
  });

  await updateUser(userId, { paidOnboardingStep: "medical" });

  return res.status(201).json({
    status: true,
    message: "Body measurements saved. Continue with medical conditions.",
    data: {
      bodyMeasurement: toPublicBodyMeasurement(measurement),
      paidOnboardingStep: "medical",
    },
  });
});

exports.submitMedicalConditionsController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const body = req.body || {};

  const condition = await createMedicalCondition({
    userId,
    hasConditions: body.hasConditions ?? body.has_conditions,
    conditionsDetails: body.conditionsDetails ?? body.conditions_details,
    conditionSince: body.conditionSince ?? body.condition_since,
    onMedication: body.onMedication ?? body.on_medication,
    medicationDetails: body.medicationDetails ?? body.medication_details,
    pastSurgery: body.pastSurgery ?? body.past_surgery,
    surgeryDetails: body.surgeryDetails ?? body.surgery_details,
    hasRestrictions: body.hasRestrictions ?? body.has_restrictions,
    restrictionsDetails: body.restrictionsDetails ?? body.restrictions_details,
  });

  const updated = await updateUser(userId, {
    paidOnboardingCompleted: true,
    paidOnboardingStep: "done",
  });

  return res.status(201).json({
    status: true,
    message: "Paid onboarding completed",
    data: {
      medicalCondition: toPublicMedicalCondition(condition),
      paidOnboardingCompleted: true,
      paidOnboardingStep: "done",
      user: await enrichUser(updated),
    },
  });
});

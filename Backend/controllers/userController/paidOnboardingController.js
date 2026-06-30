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
  createMedicalConditionAnswers,
  getLatestMedicalConditionForUser,
  toPublicMedicalCondition,
} = require("../../models/userMedicalConditionModel");
const {
  listActiveMedicalConditionQuestions,
} = require("../../models/medicalConditionQuestionModel");

function authedUserId(req) {
  return req.auth?.sub || req.user?.id;
}

function parseBoolStrict(value) {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return null;
  const s = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return null;
}

/**
 * Validate & normalize a single submitted answer against its question's answerType.
 * Returns the answer object to persist, or throws an AppError on invalid input.
 */
function normalizeAnswerForQuestion(question, raw) {
  const answerType = question.answerType;
  const base = {
    questionId: question.id,
    question: question.question,
    answerType,
  };

  if (answerType === "yes_no" || answerType === "yes_no_text") {
    const answer = parseBoolStrict(raw?.answer ?? raw?.value);
    if (answer === null) {
      throw new AppError(`A yes/no answer is required for: "${question.question}"`, 400);
    }
    base.answer = answer;
    if (answerType === "yes_no_text") {
      const details = String(raw?.details ?? raw?.text ?? "").trim();
      if (answer && !details) {
        throw new AppError(`Please provide details for: "${question.question}"`, 400);
      }
      base.details = details || null;
    }
    return base;
  }

  if (answerType === "text") {
    const text = String(raw?.text ?? raw?.answer ?? raw?.value ?? "").trim();
    if (!text) {
      throw new AppError(`An answer is required for: "${question.question}"`, 400);
    }
    base.text = text;
    return base;
  }

  if (answerType === "date") {
    const date = String(raw?.date ?? raw?.answer ?? raw?.value ?? "").trim();
    if (!date) {
      throw new AppError(`A date is required for: "${question.question}"`, 400);
    }
    if (Number.isNaN(new Date(date).getTime())) {
      throw new AppError(`Invalid date provided for: "${question.question}"`, 400);
    }
    base.date = date;
    return base;
  }

  throw new AppError(`Unsupported answer type for: "${question.question}"`, 400);
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

exports.getMedicalQuestionsController = asyncHandler(async (req, res) => {
  const questions = await listActiveMedicalConditionQuestions();

  return res.status(200).json({
    status: true,
    message: "Medical condition questions fetched",
    data: { questions },
  });
});

exports.submitMedicalConditionsController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const body = req.body || {};

  const questions = await listActiveMedicalConditionQuestions();

  // Index submitted answers by question id (accept questionId / question_id / id).
  const submitted = Array.isArray(body.answers) ? body.answers : [];
  const answersByQuestionId = new Map();
  for (const entry of submitted) {
    const qid = String(entry?.questionId ?? entry?.question_id ?? entry?.id ?? "").trim();
    if (qid) answersByQuestionId.set(qid, entry);
  }

  const normalizedAnswers = questions.map((question) => {
    const raw = answersByQuestionId.get(question.id);
    if (raw === undefined) {
      throw new AppError(`Missing answer for: "${question.question}"`, 400);
    }
    return normalizeAnswerForQuestion(question, raw);
  });

  const condition = await createMedicalConditionAnswers({
    userId,
    answers: normalizedAnswers,
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

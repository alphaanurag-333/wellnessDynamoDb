const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createChallenge,
  getChallengeById,
  getChallengeRecordById,
  listChallenges,
  updateChallenge,
  deleteChallenge,
  ALLOWED_STATUS,
  normalizeOnboardingStepKeys,
} = require("../../models/challengeModel");
const {
  listEnrollmentsByChallengeId,
  updateEnrollment,
  getEnrollmentById,
} = require("../../models/challengeEnrollmentModel");
const {
  createChallengeGroup,
  listGroupsByChallengeId,
  updateChallengeGroup,
  deleteChallengeGroup,
  getChallengeGroupById,
  incrementGroupEnrollmentCount,
} = require("../../models/challengeGroupModel");
const {
  uploadMulterFile,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const { PAID_ONBOARDING_STATUS_KEYS } = require("../../utils/paidOnboardingHelpers");
const { getUserById } = require("../../models/userModel");
const { executeChallengeLifecycleJob } = require("../../jobs/challengeLifecycleCron");

const S3_FOLDER = "challenge";

function parseJsonArray(value) {
  if (value == null || value === "") return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return undefined;
}

async function uploadChallengeImages(req, existingKeys = []) {
  const files = Array.isArray(req.files?.images) ? req.files.images : [];
  const uploaded = [];
  for (const file of files) {
    const key = await uploadMulterFile(file, S3_FOLDER);
    if (key) uploaded.push(key);
  }

  if (req.body.images !== undefined) {
    const fromBody = parseJsonArray(req.body.images) || [];
    const keys = fromBody
      .map((entry) => {
        try {
          return parseMediaKeyFromBody(entry, "images");
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return [...keys, ...uploaded].slice(0, 10);
  }

  if (uploaded.length) {
    return [...existingKeys, ...uploaded].slice(0, 10);
  }
  return undefined;
}

exports.listChallengesController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const data = await listChallenges({ page, limit, status, search });
  return res.status(200).json({
    status: true,
    challenges: data.challenges,
    pagination: data.pagination,
    onboardingStepOptions: PAID_ONBOARDING_STATUS_KEYS,
  });
});

exports.getChallengeByIdController = asyncHandler(async (req, res) => {
  const challenge = await getChallengeById(req.params.id);
  if (!challenge) throw new AppError("Challenge not found", 404);
  return res.status(200).json({
    status: true,
    challenge,
    onboardingStepOptions: PAID_ONBOARDING_STATUS_KEYS,
  });
});

exports.createChallengeController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  if (!title) throw new AppError("title is required", 400);
  if (req.body.price == null) throw new AppError("price is required", 400);
  if (!req.body.startDate) throw new AppError("startDate is required", 400);
  if (!req.body.endDate) throw new AppError("endDate is required", 400);

  const images = (await uploadChallengeImages(req, [])) || [];
  const onboardingStepKeys = normalizeOnboardingStepKeys(
    parseJsonArray(req.body.onboardingStepKeys) || []
  );

  let challenge;
  try {
    challenge = await createChallenge({
      title,
      description: req.body.description,
      price: req.body.price,
      currency: req.body.currency || "INR",
      images,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      status: req.body.status || "draft",
      onboardingStepKeys,
      whatsappMessageTemplate: req.body.whatsappMessageTemplate,
      maxGroupSize: req.body.maxGroupSize,
      createdBy: req.auth?.sub,
    });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(201).json({
    status: true,
    message: "Challenge created successfully",
    challenge,
  });
});

exports.updateChallengeController = asyncHandler(async (req, res) => {
  const current = await getChallengeRecordById(req.params.id);
  if (!current) throw new AppError("Challenge not found", 404);

  const updates = {};
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.price !== undefined) updates.price = req.body.price;
  if (req.body.currency !== undefined) updates.currency = req.body.currency;
  if (req.body.startDate !== undefined) updates.startDate = req.body.startDate;
  if (req.body.endDate !== undefined) updates.endDate = req.body.endDate;
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").toLowerCase();
    if (!ALLOWED_STATUS.has(status)) {
      throw new AppError("invalid status", 400);
    }
    updates.status = status;
  }
  if (req.body.whatsappMessageTemplate !== undefined) {
    updates.whatsappMessageTemplate = req.body.whatsappMessageTemplate;
  }
  if (req.body.maxGroupSize !== undefined) updates.maxGroupSize = req.body.maxGroupSize;
  if (req.body.onboardingStepKeys !== undefined) {
    updates.onboardingStepKeys = normalizeOnboardingStepKeys(
      parseJsonArray(req.body.onboardingStepKeys) || []
    );
  }

  const nextImages = await uploadChallengeImages(req, current.images || []);
  if (nextImages !== undefined) {
    const removed = (current.images || []).filter((key) => !nextImages.includes(key));
    for (const key of removed) {
      try {
        await deleteStoredMedia(key);
      } catch {
        /* ignore */
      }
    }
    updates.images = nextImages;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let challenge;
  try {
    challenge = await updateChallenge(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Challenge not found", 404);
    }
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Challenge updated successfully",
    challenge,
  });
});

exports.deleteChallengeController = asyncHandler(async (req, res) => {
  const current = await getChallengeRecordById(req.params.id);
  if (!current) throw new AppError("Challenge not found", 404);

  const { enrollments } = await listEnrollmentsByChallengeId(req.params.id, {
    page: 1,
    limit: 1,
  });
  if (enrollments.length) {
    throw new AppError(
      "Cannot delete — challenge has enrollments. Mark cancelled instead.",
      409
    );
  }

  for (const key of current.images || []) {
    try {
      await deleteStoredMedia(key);
    } catch {
      /* ignore */
    }
  }

  await deleteChallenge(req.params.id);
  return res.status(200).json({
    status: true,
    message: "Challenge deleted successfully",
  });
});

exports.listChallengeEnrollmentsController = asyncHandler(async (req, res) => {
  const challenge = await getChallengeById(req.params.id);
  if (!challenge) throw new AppError("Challenge not found", 404);
  const data = await listEnrollmentsByChallengeId(req.params.id, {
    page: req.query.page || 1,
    limit: req.query.limit || 50,
    status: req.query.status,
  });

  const userIds = [
    ...new Set(
      (data.enrollments || [])
        .map((row) => String(row.userId || "").trim())
        .filter(Boolean)
    ),
  ];
  const usersById = {};
  await Promise.all(
    userIds.map(async (userId) => {
      try {
        const user = await getUserById(userId);
        if (!user) return;
        usersById[userId] = {
          id: user.id,
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          phoneCountryCode: user.phoneCountryCode || "",
          userTier: user.userTier || "",
        };
      } catch {
        /* skip missing users */
      }
    })
  );

  const enrollments = (data.enrollments || []).map((row) => ({
    ...row,
    user: usersById[row.userId] || null,
  }));

  return res.status(200).json({
    status: true,
    challenge,
    enrollments,
    pagination: data.pagination,
  });
});

exports.assignEnrollmentController = asyncHandler(async (req, res) => {
  const enrollment = await getEnrollmentById(req.params.enrollmentId);
  if (!enrollment) throw new AppError("Enrollment not found", 404);
  if (enrollment.challengeId !== req.params.id) {
    throw new AppError("Enrollment does not belong to this challenge", 400);
  }

  const updates = {};
  if (req.body.groupId !== undefined) updates.groupId = req.body.groupId || null;
  if (req.body.coachId !== undefined) updates.coachId = req.body.coachId || null;

  if (updates.groupId) {
    const group = await getChallengeGroupById(updates.groupId);
    if (!group || group.challengeId !== enrollment.challengeId) {
      throw new AppError("Invalid challenge group", 400);
    }
    if (!enrollment.groupId || enrollment.groupId !== updates.groupId) {
      await incrementGroupEnrollmentCount(updates.groupId, 1);
      if (enrollment.groupId) {
        await incrementGroupEnrollmentCount(enrollment.groupId, -1);
      }
    }
    if (!updates.coachId && group.coachId) updates.coachId = group.coachId;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("groupId or coachId is required", 400);
  }

  const updated = await updateEnrollment(enrollment.id, updates);
  return res.status(200).json({
    status: true,
    message: "Enrollment assigned",
    enrollment: updated,
  });
});

exports.listChallengeGroupsController = asyncHandler(async (req, res) => {
  const challenge = await getChallengeById(req.params.id);
  if (!challenge) throw new AppError("Challenge not found", 404);
  const data = await listGroupsByChallengeId(req.params.id, {
    page: req.query.page || 1,
    limit: req.query.limit || 50,
  });
  return res.status(200).json({
    status: true,
    groups: data.groups,
    pagination: data.pagination,
  });
});

exports.createChallengeGroupController = asyncHandler(async (req, res) => {
  const challenge = await getChallengeById(req.params.id);
  if (!challenge) throw new AppError("Challenge not found", 404);
  try {
    const group = await createChallengeGroup({
      challengeId: req.params.id,
      coachId: req.body.coachId,
      capacity: req.body.capacity || challenge.maxGroupSize || 20,
      label: req.body.label,
      status: req.body.status,
    });
    return res.status(201).json({
      status: true,
      message: "Group created",
      group,
    });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }
});

exports.updateChallengeGroupController = asyncHandler(async (req, res) => {
  const group = await getChallengeGroupById(req.params.groupId);
  if (!group || group.challengeId !== req.params.id) {
    throw new AppError("Group not found", 404);
  }
  const updates = {};
  if (req.body.coachId !== undefined) updates.coachId = req.body.coachId || null;
  if (req.body.capacity !== undefined) updates.capacity = req.body.capacity;
  if (req.body.status !== undefined) updates.status = req.body.status;
  if (req.body.label !== undefined) updates.label = req.body.label;
  const updated = await updateChallengeGroup(group.id, updates);
  return res.status(200).json({ status: true, group: updated });
});

exports.deleteChallengeGroupController = asyncHandler(async (req, res) => {
  const group = await getChallengeGroupById(req.params.groupId);
  if (!group || group.challengeId !== req.params.id) {
    throw new AppError("Group not found", 404);
  }
  if (Number(group.enrolledCount) > 0) {
    throw new AppError("Cannot delete a group with enrollments", 409);
  }
  await deleteChallengeGroup(group.id);
  return res.status(200).json({ status: true, message: "Group deleted" });
});

exports.runChallengeLifecycleJobController = asyncHandler(async (_req, res) => {
  const result = await executeChallengeLifecycleJob("admin");
  if (!result) {
    throw new AppError("Lifecycle job is already running. Try again in a moment.", 409);
  }
  return res.status(200).json({
    status: true,
    message: `Lifecycle job completed for ${result.today}: granted ${result.granted}, completed ${result.completed}, failed ${result.failed}`,
    result,
  });
});

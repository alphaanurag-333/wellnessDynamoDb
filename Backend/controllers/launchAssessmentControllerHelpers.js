const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { listLaunchQuestions, listActiveLaunchQuestions } = require("../models/launchQuestionModel");
const { listLaunchFocusAreas } = require("../models/launchFocusAreaModel");
const {
  createUserLaunchAssessment,
  getUserLaunchAssessmentById,
  getUserLaunchAssessmentByUserAndDate,
  listUserLaunchAssessmentsByUserId,
  updateUserLaunchAssessment,
  deleteUserLaunchAssessment,
  SCORE_MIN,
  SCORE_MAX,
} = require("../models/userLaunchAssessmentModel");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
} = require("./dietPlanControllerHelpers");
const { updateUser } = require("../models/userModel");
const { buildLaunchStepCompletionUpdates } = require("../utils/paidOnboardingHelpers");

function handleLaunchValidationError(err) {
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  if (err?.name === "ConflictError") throw new AppError(err.message, 409);
  if (err?.name === "NotFoundError") throw new AppError(err.message, 404);
  handleValidationError(err);
}

function parseTotalScore(body) {
  if (body?.totalScore === undefined || body?.totalScore === null || body?.totalScore === "") {
    throw new AppError("totalScore is required", 400);
  }
  return body.totalScore;
}

function parseFocusAreaIds(body) {
  if (body?.focusAreaIds === undefined) return undefined;
  if (!Array.isArray(body.focusAreaIds)) {
    throw new AppError("focusAreaIds must be an array", 400);
  }
  return body.focusAreaIds;
}

function parseListQuery(req, { defaultLimit = 10, maxLimit = 50 } = {}) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(req.query.limit, 10) || defaultLimit));
  const search = String(req.query.search || "").trim() || undefined;
  return { page, limit, search };
}

function buildQuestionsCsv(user, userId, questions) {
  const escapeCsv = (value) => {
    const s = String(value ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [];
  lines.push("LAUNCH Assessment Questions");
  lines.push(`Client,${escapeCsv(user.name || "")}`);
  lines.push(`Email,${escapeCsv(user.email || "")}`);
  lines.push("");
  lines.push("Ser,Category,Question,Reply,Score");
  questions.forEach((q, index) => {
    lines.push([index + 1, escapeCsv(q.category), escapeCsv(q.question), "", ""].join(","));
  });

  const filename = `launch-questions-${user.name || userId}.csv`;
  return { content: lines.join("\r\n"), filename };
}

async function assertCoachHealUserAccess(req) {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
  assertHealTierUser(user);

  return { actingId: actingCoachId, userId, user };
}

async function assertAssistantHealUserAccess(req) {
  const actingAssistantId = req.auth?.sub;
  if (!actingAssistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, actingAssistantId);
  assertHealTierUser(user);

  return { actingId: actingAssistantId, userId, user };
}

async function assertAdminHealUserAccess(req) {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  assertHealTierUser(user);

  return { actingId: adminId, userId, user };
}

function createLaunchAssessmentPortalHandlers({ assertHealUserAccess, createdByRole }) {
  return {
    listFocusAreasController: asyncHandler(async (req, res) => {
      await assertHealUserAccess(req);
      const { page, limit, search } = parseListQuery(req, { defaultLimit: 8, maxLimit: 50 });
      const data = await listLaunchFocusAreas({ page, limit, status: "active", search });
      return res.status(200).json({
        status: true,
        message: "Areas to focus fetched successfully",
        focusAreas: data.focusAreas,
        pagination: data.pagination,
      });
    }),

    listQuestionsController: asyncHandler(async (req, res) => {
      await assertHealUserAccess(req);
      const { page, limit, search } = parseListQuery(req, { defaultLimit: 10, maxLimit: 50 });
      const data = await listLaunchQuestions({ page, limit, status: "active", search });
      return res.status(200).json({
        status: true,
        message: "LAUNCH questions fetched successfully",
        questions: data.questions,
        pagination: data.pagination,
      });
    }),

    listAssessmentsController: asyncHandler(async (req, res) => {
      const { userId } = await assertHealUserAccess(req);
      const assessments = await listUserLaunchAssessmentsByUserId(userId);
      return res.status(200).json({
        status: true,
        message: "LAUNCH assessments fetched successfully",
        assessments,
        history: assessments.map((row) => ({
          assessmentDate: row.assessmentDate,
          totalScore: row.totalScore,
          id: row.id,
        })),
      });
    }),

    getAssessmentByDateController: asyncHandler(async (req, res) => {
      const { userId } = await assertHealUserAccess(req);
      const assessmentDate = String(req.query.date || "").trim();
      if (!assessmentDate) throw new AppError("date query parameter is required", 400);

      let assessment;
      try {
        assessment = await getUserLaunchAssessmentByUserAndDate(userId, assessmentDate);
      } catch (err) {
        handleLaunchValidationError(err);
      }

      return res.status(200).json({
        status: true,
        message: assessment ? "LAUNCH assessment fetched successfully" : "No assessment for this date",
        assessment,
        scoreRange: { min: SCORE_MIN, max: SCORE_MAX },
      });
    }),

    createAssessmentController: asyncHandler(async (req, res) => {
      const { actingId, userId, user } = await assertHealUserAccess(req);
      const assessmentDate = String(req.body.assessmentDate || "").trim();
      if (!assessmentDate) throw new AppError("assessmentDate is required", 400);

      let assessment;
      try {
        assessment = await createUserLaunchAssessment({
          userId,
          coachId: resolveCoachIdForUser(user),
          assessmentDate,
          totalScore: parseTotalScore(req.body),
          focusAreaIds: parseFocusAreaIds(req.body) ?? [],
          createdByRole,
          createdById: actingId,
        });
      } catch (err) {
        if (err instanceof AppError) throw err;
        handleLaunchValidationError(err);
      }

      const launchUpdates = buildLaunchStepCompletionUpdates(user.paidOnboardingStepStatus);
      if (launchUpdates) {
        await updateUser(userId, launchUpdates);
      }

      return res.status(201).json({
        status: true,
        message: "LAUNCH score saved successfully",
        assessment,
      });
    }),

    updateAssessmentController: asyncHandler(async (req, res) => {
      const { userId } = await assertHealUserAccess(req);
      const assessmentId = String(req.params.assessmentId || "").trim();
      if (!assessmentId) throw new AppError("assessmentId is required", 400);

      const current = await getUserLaunchAssessmentById(assessmentId);
      if (!current || String(current.userId) !== String(userId)) {
        throw new AppError("LAUNCH assessment not found", 404);
      }

      const updates = {};
      if (req.body.assessmentDate !== undefined) {
        updates.assessmentDate = String(req.body.assessmentDate || "").trim();
      }
      if (req.body.totalScore !== undefined) {
        updates.totalScore = parseTotalScore(req.body);
      }
      const focusAreaIds = parseFocusAreaIds(req.body);
      if (focusAreaIds !== undefined) {
        updates.focusAreaIds = focusAreaIds;
      }

      if (Object.keys(updates).length === 0) {
        throw new AppError("At least one field is required for update", 400);
      }

      let assessment;
      try {
        assessment = await updateUserLaunchAssessment(assessmentId, updates);
      } catch (err) {
        if (err instanceof AppError) throw err;
        handleLaunchValidationError(err);
      }

      return res.status(200).json({
        status: true,
        message: "LAUNCH score updated successfully",
        assessment,
      });
    }),

    deleteAssessmentController: asyncHandler(async (req, res) => {
      const { userId } = await assertHealUserAccess(req);
      const assessmentId = String(req.params.assessmentId || "").trim();
      if (!assessmentId) throw new AppError("assessmentId is required", 400);

      const current = await getUserLaunchAssessmentById(assessmentId);
      if (!current || String(current.userId) !== String(userId)) {
        throw new AppError("LAUNCH assessment not found", 404);
      }

      try {
        await deleteUserLaunchAssessment(assessmentId);
      } catch (err) {
        handleLaunchValidationError(err);
      }

      return res.status(200).json({
        status: true,
        message: "LAUNCH assessment deleted successfully",
      });
    }),

    exportQuestionsController: asyncHandler(async (req, res) => {
      const { userId, user } = await assertHealUserAccess(req);
      const questions = await listActiveLaunchQuestions();
      const { content, filename } = buildQuestionsCsv(user, userId, questions);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename.replace(/[^\w.-]+/g, "_")}"`
      );
      return res.status(200).send(content);
    }),
  };
}

const coachHandlers = createLaunchAssessmentPortalHandlers({
  assertHealUserAccess: assertCoachHealUserAccess,
  createdByRole: "wellness_coach",
});

const assistantHandlers = createLaunchAssessmentPortalHandlers({
  assertHealUserAccess: assertAssistantHealUserAccess,
  createdByRole: "assistant_wellness_coach",
});

const adminHandlers = createLaunchAssessmentPortalHandlers({
  assertHealUserAccess: assertAdminHealUserAccess,
  createdByRole: "admin",
});

module.exports = {
  handleLaunchValidationError,
  parseTotalScore,
  parseFocusAreaIds,
  createLaunchAssessmentPortalHandlers,
  coachHandlers,
  assistantHandlers,
  adminHandlers,
};

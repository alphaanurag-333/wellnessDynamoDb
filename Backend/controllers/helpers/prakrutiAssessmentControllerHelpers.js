const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { PRAKRUTI_TYPES, PRAKRUTI_TYPE_LABELS } = require("../../utils/prakrutiConstants");
const { listPrakrutiQuestions, listActivePrakrutiQuestions } = require("../../models/prakrutiQuestionModel");
const { listPrakrutiThingsToAvoid } = require("../../models/prakrutiThingToAvoidModel");
const { listActivePrakrutiRecommendationsByType } = require("../../models/prakrutiRecommendationModel");
const {
  getLatestUserPrakrutiAssessmentByUserId,
  upsertUserPrakrutiAssessment,
  enrichAssessmentPublic,
  queryAssessmentsByUserId,
} = require("../../models/userPrakrutiAssessmentModel");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  assertStaffHealUserAccess,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  resolveStaffActor,
} = require("./dietPlanControllerHelpers");

function handlePrakrutiValidationError(err) {
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  handleValidationError(err);
}

function parseListQuery(req, { defaultLimit = 10, maxLimit = 50 } = {}) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(req.query.limit, 10) || defaultLimit));
  const search = String(req.query.search || "").trim() || undefined;
  return { page, limit, search };
}

function parseThingToAvoidIds(body) {
  if (body?.thingToAvoidIds === undefined) return undefined;
  if (!Array.isArray(body.thingToAvoidIds)) {
    throw new AppError("thingToAvoidIds must be an array", 400);
  }
  return body.thingToAvoidIds;
}

function parseSelectedQuestionIds(body) {
  if (body?.selectedQuestionIds === undefined) return undefined;
  if (!Array.isArray(body.selectedQuestionIds)) {
    throw new AppError("selectedQuestionIds must be an array", 400);
  }
  return body.selectedQuestionIds.map((id) => String(id || "").trim()).filter(Boolean);
}

function parseScores(body) {
  if (body?.scores === undefined) return undefined;
  if (!body.scores || typeof body.scores !== "object") {
    throw new AppError("scores must be an object", 400);
  }
  return {
    vata: Number(body.scores.vata) || 0,
    pitta: Number(body.scores.pitta) || 0,
    kapha: Number(body.scores.kapha) || 0,
  };
}

function buildQuestionsCsv(user, userId, questions) {
  const escapeCsv = (value) => {
    const s = String(value ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [];
  lines.push("Prakruti Assessment Questions");
  lines.push(`Client,${escapeCsv(user.name || "")}`);
  lines.push(`Email,${escapeCsv(user.email || "")}`);
  lines.push("");
  lines.push("Ser,Category,Question,Reply");
  questions.forEach((q, index) => {
    lines.push([index + 1, escapeCsv(q.category), escapeCsv(q.question), ""].join(","));
  });

  const filename = `prakruti-questions-${user.name || userId}.csv`;
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

function createPrakrutiAssessmentPortalHandlers({ assertHealUserAccess, createdByRole }) {
  return {
    listThingsToAvoidController: asyncHandler(async (req, res) => {
      resolveStaffActor(req);
      const { page, limit, search } = parseListQuery(req, { defaultLimit: 50, maxLimit: 200 });
      const data = await listPrakrutiThingsToAvoid({ page, limit, status: "active", search });
      return res.status(200).json({
        status: true,
        message: "Things to avoid fetched successfully",
        thingsToAvoid: data.thingsToAvoid,
        pagination: data.pagination,
      });
    }),

    listQuestionsController: asyncHandler(async (req, res) => {
      resolveStaffActor(req);
      const { page, limit, search } = parseListQuery(req, { defaultLimit: 50, maxLimit: 200 });
      const data = await listPrakrutiQuestions({ page, limit, status: "active", search });
      return res.status(200).json({
        status: true,
        message: "Prakruti questions fetched successfully",
        questions: data.questions,
        pagination: data.pagination,
      });
    }),

    listRecommendationsController: asyncHandler(async (req, res) => {
      resolveStaffActor(req);
      const prakrutiType = String(req.query.prakrutiType || req.query.type || "").trim();
      if (!prakrutiType) throw new AppError("prakrutiType query parameter is required", 400);
      const recommendations = await listActivePrakrutiRecommendationsByType(prakrutiType);
      return res.status(200).json({
        status: true,
        message: "Prakruti recommendations fetched successfully",
        prakrutiType,
        recommendations,
      });
    }),

    getAssessmentController: asyncHandler(async (req, res) => {
      const { userId } = await assertHealUserAccess(req);
      const raw = await getLatestUserPrakrutiAssessmentByUserId(userId);
      const assessment = raw ? await enrichAssessmentPublic(raw) : null;
      const historyRows = await queryAssessmentsByUserId(userId);
      const history = await Promise.all(historyRows.map((row) => enrichAssessmentPublic(row)));

      return res.status(200).json({
        status: true,
        message: assessment ? "Prakruti assessment fetched successfully" : "No Prakruti assessment yet",
        assessment,
        history: history.filter(Boolean),
        prakrutiTypes: PRAKRUTI_TYPES.map((value) => ({ value, label: PRAKRUTI_TYPE_LABELS[value] })),
      });
    }),

    saveAssessmentController: asyncHandler(async (req, res) => {
      const { actingId, userId, user } = await assertHealUserAccess(req);
      const prakrutiType = String(req.body.prakrutiType || "").trim();
      if (!prakrutiType) throw new AppError("prakrutiType is required", 400);

      let assessment;
      try {
        assessment = await upsertUserPrakrutiAssessment({
          userId,
          coachId: resolveCoachIdForUser(user),
          prakrutiType,
          thingToAvoidIds: parseThingToAvoidIds(req.body) ?? [],
          selectedQuestionIds: parseSelectedQuestionIds(req.body) ?? [],
          scores: parseScores(req.body) ?? null,
          forceNew: Boolean(req.body.forceNew),
          createdByRole: req.auth?.role || createdByRole,
          createdById: actingId,
        });
      } catch (err) {
        if (err instanceof AppError) throw err;
        handlePrakrutiValidationError(err);
      }

      return res.status(200).json({
        status: true,
        message: "Prakruti assessment saved successfully",
        assessment,
      });
    }),

    exportQuestionsController: asyncHandler(async (req, res) => {
      const { userId, user } = await assertHealUserAccess(req);
      const questions = await listActivePrakrutiQuestions();
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

const staffHandlers = createPrakrutiAssessmentPortalHandlers({
  assertHealUserAccess: (req) => assertStaffHealUserAccess(req, { requireHealTier: true }),
  createdByRole: "staff",
});
const coachHandlers = staffHandlers;
const assistantHandlers = staffHandlers;
const adminHandlers = staffHandlers;

module.exports = {
  handlePrakrutiValidationError,
  parseThingToAvoidIds,
  parseSelectedQuestionIds,
  parseScores,
  createPrakrutiAssessmentPortalHandlers,
  staffHandlers,
  coachHandlers,
  assistantHandlers,
  adminHandlers,
};

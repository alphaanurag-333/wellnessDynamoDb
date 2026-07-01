const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { PRAKRUTI_TYPES, PRAKRUTI_TYPE_LABELS } = require("../utils/prakrutiConstants");
const { listPrakrutiQuestions, listActivePrakrutiQuestions } = require("../models/prakrutiQuestionModel");
const { listPrakrutiThingsToAvoid } = require("../models/prakrutiThingToAvoidModel");
const {
  getLatestUserPrakrutiAssessmentByUserId,
  upsertUserPrakrutiAssessment,
  enrichAssessmentPublic,
} = require("../models/userPrakrutiAssessmentModel");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
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

function createPrakrutiAssessmentPortalHandlers({ assertHealUserAccess, createdByRole }) {
  return {
    listThingsToAvoidController: asyncHandler(async (req, res) => {
      await assertHealUserAccess(req);
      const { page, limit, search } = parseListQuery(req, { defaultLimit: 8, maxLimit: 50 });
      const data = await listPrakrutiThingsToAvoid({ page, limit, status: "active", search });
      return res.status(200).json({
        status: true,
        message: "Things to avoid fetched successfully",
        thingsToAvoid: data.thingsToAvoid,
        pagination: data.pagination,
      });
    }),

    listQuestionsController: asyncHandler(async (req, res) => {
      await assertHealUserAccess(req);
      const { page, limit, search } = parseListQuery(req, { defaultLimit: 10, maxLimit: 50 });
      const data = await listPrakrutiQuestions({ page, limit, status: "active", search });
      return res.status(200).json({
        status: true,
        message: "Prakruti questions fetched successfully",
        questions: data.questions,
        pagination: data.pagination,
      });
    }),

    getAssessmentController: asyncHandler(async (req, res) => {
      const { userId } = await assertHealUserAccess(req);
      const raw = await getLatestUserPrakrutiAssessmentByUserId(userId);
      const assessment = raw ? await enrichAssessmentPublic(raw) : null;

      return res.status(200).json({
        status: true,
        message: assessment ? "Prakruti assessment fetched successfully" : "No Prakruti assessment yet",
        assessment,
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
          createdByRole,
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

const coachHandlers = createPrakrutiAssessmentPortalHandlers({
  assertHealUserAccess: assertCoachHealUserAccess,
  createdByRole: "wellness_coach",
});

const assistantHandlers = createPrakrutiAssessmentPortalHandlers({
  assertHealUserAccess: assertAssistantHealUserAccess,
  createdByRole: "assistant_wellness_coach",
});

module.exports = {
  handlePrakrutiValidationError,
  parseThingToAvoidIds,
  createPrakrutiAssessmentPortalHandlers,
  coachHandlers,
  assistantHandlers,
};

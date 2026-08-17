const TARGET_WEIGHT = 100;
const TARGET_DOMAIN_POINTS = 100;

function round2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function isScoredDomain(domain) {
  return Number(domain?.weight) > 0;
}

function isLiveDomain(domain) {
  if (!domain) return false;
  if (domain.live === false) return false;
  if (String(domain.status || "").toLowerCase() === "inactive") return false;
  return true;
}

function isEnabledQuestion(question) {
  if (!question) return false;
  if (question.enabled === false) return false;
  if (String(question.status || "").toLowerCase() === "inactive") return false;
  return true;
}

function scoredWeightTotal(domains = []) {
  return domains.reduce((sum, domain) => {
    if (!isLiveDomain(domain) || !isScoredDomain(domain)) return sum;
    return sum + (Number(domain.weight) || 0);
  }, 0);
}

function remainingWeight(domains = [], { excludeId } = {}) {
  const filtered = excludeId
    ? domains.filter((domain) => String(domain.id) !== String(excludeId))
    : domains;
  return Math.max(0, TARGET_WEIGHT - scoredWeightTotal(filtered));
}

function remainingDomainPoints(domain, { excludeId } = {}) {
  if (!isScoredDomain(domain)) return TARGET_DOMAIN_POINTS;
  const used = (Array.isArray(domain?.questions) ? domain.questions : []).reduce((sum, question) => {
    if (!isEnabledQuestion(question)) return sum;
    if (excludeId && String(question.id) === String(excludeId)) return sum;
    return sum + (Number(question.points) || 0);
  }, 0);
  return Math.max(0, TARGET_DOMAIN_POINTS - used);
}

function domainPointsTotal(domain, { enabledOnly = true } = {}) {
  const questions = Array.isArray(domain?.questions) ? domain.questions : [];
  return questions.reduce((sum, question) => {
    if (enabledOnly && !isEnabledQuestion(question)) return sum;
    return sum + (Number(question.points) || 0);
  }, 0);
}

function liveQuestionCount(domains = []) {
  return domains.reduce((sum, domain) => {
    const questions = Array.isArray(domain.questions) ? domain.questions : [];
    return sum + questions.filter(isEnabledQuestion).length;
  }, 0);
}

function totalQuestionCount(domains = []) {
  return domains.reduce((sum, domain) => {
    const questions = Array.isArray(domain.questions) ? domain.questions : [];
    return sum + questions.length;
  }, 0);
}

function maxRatingPoints(ratings = []) {
  const active = ratings.filter((row) => String(row.status || "active").toLowerCase() !== "inactive");
  if (!active.length) return 0;
  return active.reduce((max, row) => Math.max(max, Number(row.points) || 0), 0);
}

function questionEarned(question, rating, maxRating) {
  const points = Number(question?.points) || 0;
  const ratingPoints = Number(rating?.points) || 0;
  const cap = Number(maxRating) || 0;
  if (!points || !cap) return 0;
  return (ratingPoints / cap) * points;
}

function summarizeConfig({ ratings = [], domains = [] } = {}) {
  const weightTotal = scoredWeightTotal(domains);
  const hasLiveScored = domains.some((domain) => isLiveDomain(domain) && isScoredDomain(domain));
  const domainValidity = domains.map((domain) => {
    const general = !isScoredDomain(domain);
    const live = isLiveDomain(domain);
    const pointsTotal = domainPointsTotal(domain, { enabledOnly: true });
    const pointsValid = general || !live || pointsTotal === TARGET_DOMAIN_POINTS;
    return {
      id: domain.id,
      name: domain.name,
      weight: Number(domain.weight) || 0,
      live,
      general,
      pointsTotal,
      pointsValid,
    };
  });

  return {
    weightTotal,
    remainingWeight: Math.max(0, TARGET_WEIGHT - weightTotal),
    liveQuestionCount: liveQuestionCount(domains),
    totalQuestionCount: totalQuestionCount(domains),
    maxRating: maxRatingPoints(ratings),
    targetWeight: TARGET_WEIGHT,
    targetDomainPoints: TARGET_DOMAIN_POINTS,
    valid: {
      weights: !hasLiveScored || weightTotal === TARGET_WEIGHT,
      domains: domainValidity,
    },
  };
}

function scoreAnswers({ ratings = [], domains = [], answers = [] } = {}) {
  const maxRating = maxRatingPoints(ratings);
  const ratingById = new Map(ratings.map((row) => [String(row.id), row]));
  const answerByQuestion = new Map(
    (Array.isArray(answers) ? answers : [])
      .filter((row) => row && row.questionId)
      .map((row) => [String(row.questionId), String(row.ratingId || "")])
  );

  const domainScores = [];
  let overallScore = 0;
  const unanswered = [];

  for (const domain of domains) {
    const live = isLiveDomain(domain);
    const scored = isScoredDomain(domain);
    const questions = Array.isArray(domain.questions) ? domain.questions : [];

    if (!live || !scored) {
      domainScores.push({
        id: domain.id,
        name: domain.name,
        score: null,
        weight: Number(domain.weight) || 0,
        weighted: 0,
        general: !scored,
        live,
        questions: [],
      });
      continue;
    }

    let earned = 0;
    const questionRows = [];
    for (const question of questions.filter(isEnabledQuestion)) {
      const ratingId = answerByQuestion.get(String(question.id)) || "";
      const rating = ratingId ? ratingById.get(ratingId) : null;
      if (!rating) {
        unanswered.push({ domainId: domain.id, questionId: question.id, name: question.name });
      }
      const qEarned = questionEarned(question, rating, maxRating);
      earned += qEarned;
      questionRows.push({
        id: question.id,
        name: question.name,
        points: Number(question.points) || 0,
        ratingId: rating ? rating.id : null,
        ratingName: rating ? rating.name : null,
        ratingPoints: rating ? Number(rating.points) || 0 : 0,
        earned: round2(qEarned),
      });
    }

    const weighted = earned * ((Number(domain.weight) || 0) / TARGET_WEIGHT);
    overallScore += weighted;
    domainScores.push({
      id: domain.id,
      name: domain.name,
      score: round2(earned),
      weight: Number(domain.weight) || 0,
      weighted: round2(weighted),
      general: false,
      live: true,
      questions: questionRows,
    });
  }

  return {
    overallScore: round2(overallScore),
    maxScore: TARGET_WEIGHT,
    maxRating,
    domainScores,
    unanswered,
  };
}

module.exports = {
  TARGET_WEIGHT,
  TARGET_DOMAIN_POINTS,
  round2,
  isScoredDomain,
  isLiveDomain,
  isEnabledQuestion,
  scoredWeightTotal,
  remainingWeight,
  remainingDomainPoints,
  domainPointsTotal,
  liveQuestionCount,
  totalQuestionCount,
  maxRatingPoints,
  questionEarned,
  summarizeConfig,
  scoreAnswers,
};

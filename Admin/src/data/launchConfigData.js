function buildQuestions(texts) {
  return texts.map((name, index) => ({
    id: `q-${index + 1}`,
    name,
    points: index < 4 ? 7 : 6,
    enabled: true,
    fixed: false,
    hasInfo: true,
  }));
}

const GUT_HEALTH_QUESTIONS = [
  "How often do you experience bloating after meals?",
  "How regular are your bowel movements?",
  "Do you feel discomfort or acidity after eating?",
  "How often do you eat fermented foods (curd, kimchi, etc.)?",
  "How much fibre-rich food is in your daily diet?",
  "Do you experience frequent gas or flatulence?",
  "How often do you feel heaviness after a meal?",
  "Do you take probiotics or gut supplements?",
  "How well hydrated do you stay through the day?",
  "Do you experience food intolerances or sensitivities?",
  "How often do you eat processed or packaged foods?",
  "Do you chew your food slowly and thoroughly?",
  "How often do you skip or delay meals?",
  "Do you experience cravings for sugar or refined carbs?",
  "How would you rate your overall digestion?",
  "Do you notice a link between stress and your gut?",
];

const IMMUNITY_QUESTIONS = [
  "How often do you fall sick in a year?",
  "How quickly do you recover from common illnesses?",
  "How often do you get seasonal infections?",
  "Do you take vitamin C, D or zinc regularly?",
  "How much sunlight exposure do you get daily?",
  "How varied and colourful is your diet?",
  "Do you experience frequent fatigue or low energy?",
  "How often do you get restorative sleep?",
  "Do you have any recurring allergies?",
  "How often do you exercise moderately?",
  "Do you manage stress levels effectively?",
  "How well do wounds or cuts heal for you?",
  "Do you consume enough protein daily?",
  "How often do you eat immunity-supporting foods?",
  "Do you smoke or are exposed to smoke?",
  "How would you rate your overall resilience to illness?",
];

const PHYSICAL_QUESTIONS = [
  "How many days a week do you exercise?",
  "How would you rate your cardiovascular fitness?",
  "How would you rate your muscular strength?",
  "How flexible are you?",
  "Do you experience joint pain or stiffness?",
  "How is your balance and coordination?",
  "How many hours do you sit per day?",
  "Do you take regular breaks from sitting?",
  "How often do you stretch or do mobility work?",
  "How is your posture through the day?",
  "Do you experience frequent physical fatigue?",
  "How well do you maintain a healthy weight?",
  "How often do you engage in strength training?",
  "Do you get enough restorative sleep for recovery?",
  "How would you rate your overall physical stamina?",
  "Do you listen to your body and rest when needed?",
];

const MENTAL_QUESTIONS = [
  "How would you rate your daily stress level?",
  "How often do you feel anxious or on edge?",
  "How well do you concentrate on tasks?",
  "How often do you feel low or unmotivated?",
  "How well do you manage work-life balance?",
  "Do you practise mindfulness or meditation?",
  "How restful and consistent is your sleep?",
  "How often do you feel mentally exhausted?",
  "How well do you handle unexpected changes?",
  "Do you have healthy outlets for stress?",
  "How would you rate your emotional stability?",
  "How often do you feel positive and optimistic?",
  "Do you seek support when feeling low?",
  "How well do you sleep when stressed?",
  "How often do you feel mentally refreshed after waking?",
  "How well do you manage negative self-talk?",
];

const PSYCHOLOGICAL_QUESTIONS = [
  "How satisfied are you with your life overall?",
  "How connected do you feel to others socially?",
  "How often do you feel lonely or isolated?",
  "How would you rate your self-esteem?",
  "Do you feel understood by people close to you?",
  "How well do you express your emotions?",
  "How often do you engage in meaningful conversations?",
  "Do you feel satisfied with your personal relationships?",
  "How would you rate your resilience after setbacks?",
  "Do you set and pursue personal goals?",
  "How often do you feel a sense of accomplishment?",
  "How well do you cope with criticism or rejection?",
  "Do you practice self-compassion?",
  "How would you rate your overall life satisfaction?",
  "How well do you manage negative self-talk?",
  "How aligned are your actions with your values?",
];

export const LAUNCH_CONFIG_RATINGS = [
  {
    id: "excellent",
    badge: "EXCELLENT",
    tone: "excellent",
    name: "Excellent",
    points: 100,
    description: "Consistent and self-driven — reinforce the habit, no change needed.",
  },
  {
    id: "good",
    badge: "GOOD",
    tone: "good",
    name: "Good",
    points: 75,
    description: "Mostly on track — one small nudge on the weaker days.",
  },
  {
    id: "average",
    badge: "FAIR",
    tone: "average",
    name: "Fair",
    points: 50,
    description: "Inconsistent — set a single specific target for the week.",
  },
  {
    id: "poor",
    badge: "POOR",
    tone: "poor",
    name: "Poor",
    points: 25,
    description: "Needs intervention — protocol change or a call this week.",
  },
];

export const LAUNCH_CONFIG_DOMAINS = [
  {
    id: "domain-gut",
    name: "Load Preset",
    weight: 20,
    live: true,
    fixed: false,
    questions: buildQuestions(GUT_HEALTH_QUESTIONS),
  },
  {
    id: "domain-immunity",
    name: "Immunity",
    weight: 20,
    live: true,
    fixed: false,
    questions: buildQuestions(IMMUNITY_QUESTIONS),
  },
  {
    id: "domain-physical",
    name: "Physical Health",
    weight: 20,
    live: true,
    fixed: false,
    questions: buildQuestions(PHYSICAL_QUESTIONS),
  },
  {
    id: "domain-mental",
    name: "Mental Health",
    weight: 20,
    live: true,
    fixed: false,
    questions: buildQuestions(MENTAL_QUESTIONS),
  },
  {
    id: "domain-psych",
    name: "Psychological Health",
    weight: 20,
    live: true,
    fixed: false,
    questions: buildQuestions(PSYCHOLOGICAL_QUESTIONS),
  },
];

export function launchDomainPointsTotal(domain, { enabledOnly = false } = {}) {
  return (domain.questions ?? []).reduce((sum, entry) => {
    if (enabledOnly && !entry.enabled) return sum;
    return sum + (Number(entry.points) || 0);
  }, 0);
}

export function launchLiveQuestionCount(domains) {
  return domains.reduce(
    (sum, domain) => sum + (domain.questions ?? []).filter((entry) => entry.enabled).length,
    0,
  );
}

export function launchTotalQuestionCount(domains) {
  return domains.reduce((sum, domain) => sum + (domain.questions ?? []).length, 0);
}

export function launchScoredWeightTotal(domains) {
  return domains.reduce(
    (sum, domain) => sum + (Number(domain.weight) > 0 ? Number(domain.weight) || 0 : 0),
    0,
  );
}

export function launchRemainingWeight(domains) {
  return Math.max(0, 100 - launchScoredWeightTotal(domains));
}

export function launchDomainIsGeneral(domain) {
  return !Number(domain.weight);
}

export function launchRemainingDomainPoints(domain, { excludeId } = {}) {
  if (launchDomainIsGeneral(domain)) return 100;
  const used = (domain.questions ?? []).reduce((sum, entry) => {
    if (!entry.enabled) return sum;
    if (excludeId && entry.id === excludeId) return sum;
    return sum + (Number(entry.points) || 0);
  }, 0);
  return Math.max(0, 100 - used);
}

export function launchMaxRatingPoints(ratings = []) {
  if (!ratings.length) return 0;
  return ratings.reduce((max, row) => Math.max(max, Number(row.points) || 0), 0);
}

export function launchQuestionEarned(question, rating, maxRating) {
  const points = Number(question?.points) || 0;
  const ratingPoints = Number(rating?.points) || 0;
  const cap = Number(maxRating) || 0;
  if (!points || !cap) return 0;
  return Math.round(((ratingPoints / cap) * points) * 100) / 100;
}

export function launchScoringHint(ratings = []) {
  const maxRating = launchMaxRatingPoints(ratings) || 100;
  return `Coaches pick one rating per question. Earned = (rating pts ÷ ${maxRating}) × question pts. Domain scores sum to 100 when question pts total 100. Overall = Σ (domain score × domain weight ÷ 100).`;
}

export function liveLaunchDomains(domains = []) {
  return (domains || []).filter((domain) => domain && domain.live !== false);
}

export function liveLaunchQuestions(domain) {
  return (domain?.questions || []).filter((question) => question && question.enabled !== false);
}

export function computeLaunchAssessment({ domains = [], ratings = [], ratingByQuestion = {} } = {}) {
  const liveDomains = liveLaunchDomains(domains);
  const maxRating = launchMaxRatingPoints(ratings) || 100;
  let overall = 0;

  const domainRows = liveDomains.map((domain, index) => {
    const questions = liveLaunchQuestions(domain);
    const general = launchDomainIsGeneral(domain);
    let earned = 0;
    const items = questions.map((question) => {
      const ratingId = ratingByQuestion[question.id] || "";
      const rating = ratings.find((row) => String(row.id) === String(ratingId));
      const qEarned = launchQuestionEarned(question, rating, maxRating);
      earned += qEarned;
      return {
        id: question.id,
        q: question.name,
        points: Number(question.points) || 0,
        earned: qEarned,
        ratingId,
        hasInfo: question.hasInfo !== false,
      };
    });
    if (!general) {
      overall += earned * ((Number(domain.weight) || 0) / 100);
    }
    return {
      id: domain.id,
      num: index + 1,
      title: domain.name,
      questions: questions.length,
      score: Math.round(earned * 100) / 100,
      max: 100,
      weight: Number(domain.weight) || 0,
      general,
      items,
    };
  });

  return {
    overall: Math.round(overall * 100) / 100,
    maxOverall: 100,
    finalScore: Math.round(overall) / 10,
    domainRows,
    maxRating,
  };
}


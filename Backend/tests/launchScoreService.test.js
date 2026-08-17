const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  remainingWeight,
  remainingDomainPoints,
  summarizeConfig,
  scoreAnswers,
  questionEarned,
} = require("../services/launchScoreService");

const ratings = [
  { id: "excellent", name: "Excellent", points: 100, status: "active" },
  { id: "good", name: "Good", points: 75, status: "active" },
  { id: "fair", name: "Fair", points: 50, status: "active" },
  { id: "poor", name: "Poor", points: 25, status: "active" },
];

function domain(id, weight, questions) {
  return { id, name: id, weight, live: true, questions };
}

describe("launchScoreService", () => {
  it("treats remaining weight as 100 minus live scored domains", () => {
    const domains = [domain("gut", 20, []), domain("imm", 20, []), domain("gen", 0, [])];
    assert.equal(remainingWeight(domains), 60);
  });

  it("marks weights valid only when live scored domains total 100", () => {
    const incomplete = summarizeConfig({
      ratings,
      domains: [domain("gut", 20, [])],
    });
    assert.equal(incomplete.valid.weights, false);
    assert.equal(incomplete.weightTotal, 20);

    const complete = summarizeConfig({
      ratings,
      domains: [
        domain("a", 20, []),
        domain("b", 20, []),
        domain("c", 20, []),
        domain("d", 20, []),
        domain("e", 20, []),
      ],
    });
    assert.equal(complete.valid.weights, true);
    assert.equal(complete.remainingWeight, 0);
  });

  it("caps remaining domain points at 100 for scored domains", () => {
    const gut = domain("gut", 20, [
      { id: "q1", points: 90, enabled: true },
      { id: "q2", points: 20, enabled: false },
    ]);
    assert.equal(remainingDomainPoints(gut), 10);
    assert.equal(remainingDomainPoints(gut, { excludeId: "q1" }), 100);
    assert.equal(remainingDomainPoints(domain("gen", 0, [{ id: "g1", points: 40, enabled: true }])), 100);
  });

  it("scales question points by rating / max rating", () => {
    const earned = questionEarned({ points: 7 }, { points: 75 }, 100);
    assert.equal(earned, 5.25);
  });

  it("computes overall score as weighted domain scores", () => {
    const questions = [
      { id: "q1", points: 50, enabled: true },
      { id: "q2", points: 50, enabled: true },
    ];
    const domains = [
      domain("gut", 20, questions),
      domain("imm", 80, questions.map((row, index) => ({ ...row, id: `i${index}` }))),
    ];
    const result = scoreAnswers({
      ratings,
      domains,
      answers: [
        { questionId: "q1", ratingId: "excellent" },
        { questionId: "q2", ratingId: "excellent" },
        { questionId: "i0", ratingId: "excellent" },
        { questionId: "i1", ratingId: "excellent" },
      ],
    });
    assert.equal(result.overallScore, 100);
    assert.equal(result.domainScores[0].score, 100);
    assert.equal(result.domainScores[0].weighted, 20);
  });

  it("excludes general and off domains from overall score", () => {
    const domains = [
      { id: "gen", name: "General", weight: 0, live: true, questions: [{ id: "g1", points: 10, enabled: true }] },
      { id: "off", name: "Off", weight: 20, live: false, questions: [{ id: "o1", points: 100, enabled: true }] },
      domain("gut", 100, [{ id: "q1", points: 100, enabled: true }]),
    ];
    const result = scoreAnswers({
      ratings,
      domains,
      answers: [
        { questionId: "g1", ratingId: "excellent" },
        { questionId: "o1", ratingId: "excellent" },
        { questionId: "q1", ratingId: "good" },
      ],
    });
    assert.equal(result.overallScore, 75);
    assert.equal(result.domainScores[0].score, null);
    assert.equal(result.domainScores[1].weighted, 0);
  });
});

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  remainingWeight,
  remainingSectionPoints,
  summarizeConfig,
} = require("../services/drfConfigService");

describe("drfConfigService", () => {
  it("treats remaining weight as 100 minus live sections", () => {
    const sections = [
      { id: "a", weight: 20, live: true },
      { id: "b", weight: 35, live: true },
      { id: "c", weight: 25, live: false },
    ];
    assert.equal(remainingWeight(sections), 45);
  });

  it("caps remaining section points at 100", () => {
    const section = {
      id: "meal",
      weight: 20,
      live: true,
      questions: [
        { id: "q1", points: 60, enabled: true },
        { id: "q2", points: 20, enabled: false },
      ],
    };
    assert.equal(remainingSectionPoints(section), 40);
    assert.equal(remainingSectionPoints(section, { excludeId: "q1" }), 100);
  });

  it("marks weights valid when live sections total 100", () => {
    const summary = summarizeConfig([
      { id: "a", weight: 20, live: true, questions: [] },
      { id: "b", weight: 35, live: true, questions: [] },
      { id: "c", weight: 25, live: true, questions: [] },
      { id: "d", weight: 20, live: true, questions: [] },
    ]);
    assert.equal(summary.valid.weights, true);
    assert.equal(summary.remainingWeight, 0);
  });
});

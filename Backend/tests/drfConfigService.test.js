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

  it("lets coaches select live bank questions and keeps fixed ones on", () => {
    const {
      applyUserDrfSelection,
      selectedQuestionIdsFromSections,
    } = require("../services/drfConfigService");
    const catalog = [
      {
        id: "meal",
        name: "Meal Tracking",
        weight: 20,
        live: true,
        questions: [
          { id: "salad", name: "Salad", points: 10, enabled: true, fixed: true },
          { id: "protein", name: "Protein", points: 10, enabled: true, fixed: false },
          { id: "off", name: "Hidden", points: 10, enabled: false, fixed: false },
        ],
      },
      {
        id: "idle",
        name: "Idle",
        weight: 10,
        live: false,
        questions: [{ id: "x", name: "X", points: 10, enabled: true }],
      },
    ];

    const unsaved = applyUserDrfSelection(catalog, ["protein"], { saved: false });
    assert.equal(unsaved.length, 1);
    assert.deepEqual(
      unsaved[0].questions.map((row) => ({ id: row.id, selected: row.selected })),
      [
        { id: "salad", selected: true },
        { id: "protein", selected: false },
      ],
    );

    const saved = applyUserDrfSelection(catalog, ["protein"], { saved: true });
    assert.deepEqual(selectedQuestionIdsFromSections(saved).sort(), ["protein", "salad"]);
  });
});

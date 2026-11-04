const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildUserDietPlansListPayload } = require("../utils/dietPlanUserAppView");

const samplePlan = {
  planId: "personalised-coach-plan",
  name: "Personalised diet plan",
  meals: [{
    mealId: "m1",
    day: "section-1",
    slot: "snack",
    sectionTitle: "Breakfast",
    title: "Option 1",
    foods: "Oats",
    notes: "1 bowl",
    sequence: 1,
  }],
};

describe("dietPlanUserAppView", () => {
  it("adds personalisedSections for mobile clients", () => {
    const assignment = {
      id: "a1",
      pdfUrl: "https://example.com/plan.pdf",
      pdfKey: "diet-plan-assignments/plan.pdf",
      plans: [samplePlan],
    };
    const payload = buildUserDietPlansListPayload(assignment);
    assert.equal(payload.recommended.id, "a1");
    assert.equal(payload.personalisedSections.length, 1);
    assert.equal(payload.personalisedSections[0].title, "Breakfast");
    assert.equal(payload.personalisedSections[0].rows[0].label, "Option 1");
    assert.equal(payload.assignment.personalisedSections.length, 1);
    assert.deepEqual(payload.history, []);
  });

  it("returns archived pushes in history separate from recommended", () => {
    const recommended = {
      id: "active",
      pushedAt: "2026-01-03T00:00:00.000Z",
      startDate: "2026-01-03",
      pdfUrl: "https://example.com/live.pdf",
      pdfKey: "diet-plan-assignments/live.pdf",
      plans: [samplePlan],
    };
    const archived = {
      id: "h1",
      pushedAt: "2026-01-01T00:00:00.000Z",
      startDate: "2026-01-01",
      pdfUrl: "https://example.com/old.pdf",
      pdfKey: "diet-plan-assignments/old.pdf",
      plans: [samplePlan],
    };
    const payload = buildUserDietPlansListPayload(recommended, [archived]);
    assert.equal(payload.recommended.id, "active");
    assert.equal(payload.history.length, 1);
    assert.equal(payload.history[0].id, "h1");
    assert.equal(payload.assignments.length, 2);
  });
});

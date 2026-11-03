const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildUserDietPlansListPayload } = require("../utils/dietPlanUserAppView");

describe("dietPlanUserAppView", () => {
  it("adds personalisedSections for mobile clients", () => {
    const assignment = {
      id: "a1",
      pdfUrl: "https://example.com/plan.pdf",
      pdfKey: "diet-plan-assignments/plan.pdf",
      plans: [{
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
      }],
    };
    const payload = buildUserDietPlansListPayload([assignment]);
    assert.equal(payload.recommended.id, "a1");
    assert.equal(payload.personalisedSections.length, 1);
    assert.equal(payload.personalisedSections[0].title, "Breakfast");
    assert.equal(payload.personalisedSections[0].rows[0].label, "Option 1");
    assert.equal(payload.assignment.personalisedSections.length, 1);
  });
});

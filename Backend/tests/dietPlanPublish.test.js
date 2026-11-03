const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  isLegacyPublishedAssignment,
  isVisibleInClientApp,
  draftDiffersFromPublished,
  toCoachAssignedDietPlanPublic,
} = require("../models/coachAssignedDietPlanModel");

describe("diet plan draft vs publish", () => {
  it("treats legacy rows with pdf as published in the client app", () => {
    const row = {
      id: "a1",
      userId: "u1",
      coachId: "c1",
      startDate: "2026-01-01",
      plans: [{ planId: "p1", name: "Plan", type: "GENERAL", category: "", description: "", meals: [] }],
      pdfKey: "diet-plan-assignments/old.pdf",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(isLegacyPublishedAssignment(row), true);
    assert.equal(isVisibleInClientApp(row), true);
  });

  it("hides draft-only assignments from the user-facing payload", () => {
    const row = {
      id: "a2",
      userId: "u1",
      coachId: "c1",
      startDate: "2026-01-01",
      plans: [{ planId: "personalised-coach-plan", name: "Personalised diet plan", type: "GENERAL", category: "", description: "", meals: [{ mealId: "m1", day: "s1", slot: "snack", title: "Option 1", foods: "Food", notes: "1 cup", sequence: 1 }] }],
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    assert.equal(isVisibleInClientApp(row), false);
    assert.equal(toCoachAssignedDietPlanPublic(row, { audience: "user" }), null);
    const admin = toCoachAssignedDietPlanPublic(row, { audience: "admin" });
    assert.equal(admin.hasUnpublishedChanges, true);
  });

  it("serves published snapshot to the user after push", () => {
    const draftPlan = { planId: "personalised-coach-plan", name: "Personalised diet plan", type: "GENERAL", category: "", description: "", meals: [{ mealId: "m1", day: "s1", slot: "snack", sectionTitle: "Breakfast", title: "Option 1", foods: "Oats", notes: "1 bowl", sequence: 1 }] };
    const row = {
      id: "a3",
      userId: "u1",
      coachId: "c1",
      startDate: "2026-01-01",
      plans: [draftPlan],
      publishedPlans: [draftPlan],
      publishedPdfKey: "diet-plan-assignments/live.pdf",
      pushedAt: "2026-01-03T00:00:00.000Z",
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
    };
    assert.equal(draftDiffersFromPublished(row), false);
    const userView = toCoachAssignedDietPlanPublic(row, { audience: "user" });
    assert.equal(userView.pdfKey, "diet-plan-assignments/live.pdf");
    assert.equal(userView.plans.length, 1);
    assert.equal(userView.plans[0].meals[0].title, "Option 1");
  });
});

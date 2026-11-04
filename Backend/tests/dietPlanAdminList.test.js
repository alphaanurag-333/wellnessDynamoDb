const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { splitCoachDietPlanAssignmentsForAdmin } = require("../utils/dietPlanAdminList");

describe("splitCoachDietPlanAssignmentsForAdmin", () => {
  it("uses archived rows as push history and keeps the active editor separate", () => {
    const active = { id: "active", archived: false, createdAt: "2026-01-03T00:00:00.000Z" };
    const older = { id: "h1", archived: true, pushedAt: "2026-01-01T10:00:00.000Z" };
    const newer = { id: "h2", archived: true, pushedAt: "2026-01-02T10:00:00.000Z" };
    const result = splitCoachDietPlanAssignmentsForAdmin([active, older, newer]);
    assert.equal(result.active?.id, "active");
    assert.deepEqual(result.history.map((row) => row.id), ["h2", "h1"]);
  });

  it("falls back to legacy multiple-assignment history", () => {
    const result = splitCoachDietPlanAssignmentsForAdmin([
      { id: "a", createdAt: "2026-01-03T00:00:00.000Z" },
      {
        id: "b",
        createdAt: "2026-01-02T00:00:00.000Z",
        plans: [{ planId: "p1", name: "Plan", type: "GENERAL", category: "", description: "", meals: [] }],
        pdfKey: "diet-plan-assignments/old.pdf",
      },
    ]);
    assert.equal(result.active?.id, "a");
    assert.deepEqual(result.history.map((row) => row.id), ["b"]);
  });

  it("skips draft-only rows from legacy history", () => {
    const result = splitCoachDietPlanAssignmentsForAdmin([
      { id: "a", createdAt: "2026-01-03T00:00:00.000Z" },
      { id: "b", createdAt: "2026-01-02T00:00:00.000Z", plans: [{ planId: "p1", name: "Plan", type: "GENERAL", category: "", description: "", meals: [] }] },
    ]);
    assert.equal(result.active?.id, "a");
    assert.deepEqual(result.history, []);
  });
});

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  toUserLaunchAssessmentPublic,
  resolvePublishedTotalScore,
} = require("../models/userLaunchAssessmentModel");

describe("toUserLaunchAssessmentPublic areasToFocus", () => {
  it("does not expose focus text before push even when draft and catalog ids exist", () => {
    const pub = toUserLaunchAssessmentPublic(
      {
        id: "a1",
        userId: "u1",
        assessmentDate: "2026-01-01",
        totalScore: 50,
        focusAreaIds: ["area-1"],
        focusPoints: ["Improve morning hydration"],
        answers: [],
      },
      [{ id: "area-1", title: "Hydration habit" }],
    );
    assert.deepEqual(pub.areasToFocus, []);
    assert.equal(pub.focusPointsPushedAt, null);
  });

  it("exposes pushed focus points to the client app", () => {
    const pub = toUserLaunchAssessmentPublic(
      {
        id: "a1",
        userId: "u1",
        assessmentDate: "2026-01-01",
        totalScore: 50,
        focusAreaIds: ["area-1"],
        focusPoints: ["Improve morning hydration", "Plan regular meals"],
        pushedFocusPoints: ["Improve morning hydration", "Plan regular meals"],
        focusPointsPushedAt: "2026-01-02T12:00:00.000Z",
        answers: [],
      },
      [{ id: "area-1", title: "Hydration habit" }],
    );
    assert.deepEqual(pub.areasToFocus, [
      "Improve morning hydration",
      "Plan regular meals",
    ]);
  });
});

describe("resolvePublishedTotalScore", () => {
  it("returns draft totalScore for legacy rows without publish fields", () => {
    assert.equal(
      resolvePublishedTotalScore({ totalScore: 120 }),
      120,
    );
  });

  it("returns null for new rows that were saved but not pushed", () => {
    assert.equal(
      resolvePublishedTotalScore({
        totalScore: 120,
        scorePushedAt: null,
        pushedTotalScore: null,
      }),
      null,
    );
  });

  it("returns pushed score after publish", () => {
    assert.equal(
      resolvePublishedTotalScore({
        totalScore: 150,
        scorePushedAt: "2026-01-02T12:00:00.000Z",
        pushedTotalScore: 120,
      }),
      120,
    );
  });
});

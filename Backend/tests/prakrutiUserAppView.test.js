const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  publishedPrakrutiRow,
  draftDiffersFromPublished,
  readDraftRecommendationTexts,
  readDraftAvoidTexts,
} = require("../utils/prakrutiUserAppView");

describe("prakrutiUserAppView", () => {
  it("returns null for draft-only records (never pushed)", () => {
    const row = {
      prakrutiType: "vata",
      recommendationTexts: ["Draft rec"],
      avoidTexts: ["Draft avoid"],
    };
    assert.equal(publishedPrakrutiRow(row), null);
  });

  it("returns only pushed snapshot fields for the mobile app", () => {
    const row = {
      id: "a1",
      userId: "u1",
      prakrutiType: "vata",
      recommendationTexts: ["Draft rec"],
      avoidTexts: ["Draft avoid"],
      pushedAt: "2026-01-01T00:00:00.000Z",
      pushedPrakrutiType: "vata",
      pushedRecommendationTexts: ["Published rec"],
      pushedAvoidTexts: ["Published avoid"],
    };
    const pub = publishedPrakrutiRow(row);
    assert.equal(pub.recommendationTexts[0], "Published rec");
    assert.equal(pub.avoidTexts[0], "Published avoid");
    assert.equal(pub.prakrutiType, "vata");
    assert.equal(pub.recommendationTexts[0], "Published rec");
    assert.notEqual(pub.recommendationTexts[0], row.recommendationTexts[0]);
  });

  it("reads coach draft lists without exposing legacy app fields on save", () => {
    const row = {
      draftRecommendationTexts: ["Coach draft rec"],
      draftAvoidTexts: ["Coach draft avoid"],
      recommendationTexts: ["Still in app until push"],
      avoidTexts: ["Still in app until push"],
    };
    assert.deepEqual(readDraftRecommendationTexts(row), ["Coach draft rec"]);
    assert.deepEqual(readDraftAvoidTexts(row), ["Coach draft avoid"]);
  });

  it("detects when draft edits differ from published snapshot", () => {
    const row = {
      pushedAt: "2026-01-01T00:00:00.000Z",
      prakrutiType: "vata",
      pushedPrakrutiType: "vata",
      recommendationTexts: ["New draft"],
      pushedRecommendationTexts: ["Published"],
      avoidTexts: ["Same"],
      pushedAvoidTexts: ["Same"],
    };
    assert.equal(draftDiffersFromPublished(row), true);

    row.recommendationTexts = ["Published"];
    assert.equal(draftDiffersFromPublished(row), false);
  });
});

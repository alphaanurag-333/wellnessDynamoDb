const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  progressPhotoCalendarDay,
  recordsOnSameDay,
} = require("../utils/progressPhotoDay");
const { anglesPresentOnPhoto } = require("../models/userProgressPhotoModel");

describe("progress photo day", () => {
  it("groups photos by the India calendar day", () => {
    const evening = "2026-08-31T18:30:00.000Z";
    const morning = "2026-08-31T02:30:00.000Z";
    assert.equal(progressPhotoCalendarDay(evening), "2026-09-01");
    assert.equal(progressPhotoCalendarDay(morning), "2026-08-31");
    const sameDay = recordsOnSameDay([
      { id: "a", recordedAt: "2026-08-31T04:00:00.000Z" },
      { id: "b", recordedAt: "2026-08-31T16:00:00.000Z" },
      { id: "c", recordedAt: "2026-09-01T04:00:00.000Z" },
    ], "2026-08-31");
    assert.deepEqual(sameDay.map((row) => row.id), ["a", "b"]);
  });

  it("only includes angles that have a photo", () => {
    assert.deepEqual(anglesPresentOnPhoto({
      frontPicKey: "front.jpg",
      rightPicKey: null,
      leftPicKey: "left.jpg",
    }), ["front", "left"]);
  });
});

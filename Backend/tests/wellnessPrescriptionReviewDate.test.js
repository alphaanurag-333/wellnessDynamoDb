const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  getReviewAt,
  getLatestActiveReviewAt,
} = require("../models/coachAssignedWellnessPrescriptionModel");
const { coachMeetingsFromAssignments } = require("../services/wellnessPrescriptionReviewService");

describe("wellness prescription review date", () => {
  it("uses the prescription date instead of when the row was saved", () => {
    assert.equal(
      getReviewAt({
        date: "2026-10-02",
        createdAt: "2026-10-19T08:00:00.000Z",
        updatedAt: "2026-10-19T09:00:00.000Z",
        reviewStatus: "active",
      }),
      "2026-10-02",
    );
  });

  it("picks the latest active prescription date and skips cancelled reviews", () => {
    assert.equal(
      getLatestActiveReviewAt([
        { date: "2026-09-01", reviewStatus: "active", createdAt: "2026-10-19T00:00:00.000Z" },
        { date: "2026-10-15", reviewStatus: "cancelled", createdAt: "2026-10-18T00:00:00.000Z" },
        { date: "2026-10-10", reviewStatus: "active", createdAt: "2026-08-01T00:00:00.000Z" },
      ]),
      "2026-10-10",
    );
  });

  it("lists coach meetings by prescription date, newest first", () => {
    const meetings = coachMeetingsFromAssignments([
      { id: "a", date: "2026-09-01", reviewStatus: "active", summary: "First", authorName: "Coach" },
      { id: "b", date: "2026-10-10", reviewStatus: "cancelled", summary: "Later", authorName: "Coach" },
    ]);
    assert.deepEqual(
      meetings.map((row) => row.date),
      ["2026-10-10", "2026-09-01"],
    );
    assert.equal(meetings[0].cancelled, true);
  });
});

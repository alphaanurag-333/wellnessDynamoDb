const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  getReviewAt,
  getLatestActiveReviewAt,
} = require("../models/coachAssignedWellnessPrescriptionModel");
const {
  coachMeetingsFromAssignments,
  deriveReviewLifecycleDates,
} = require("../services/wellnessPrescriptionReviewService");

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

  it("includes scheduled, completed, and cancelled dates on coach meetings", () => {
    const assignment = {
      id: "rx-1",
      date: "2026-09-01",
      reviewStatus: "active",
      summary: "First",
      authorName: "Coach",
    };
    const track = {
      status: "completed",
      scheduledAt: "2026-08-28T10:30:00.000Z",
      updatedAt: "2026-09-01T11:00:00.000Z",
      selectedDate: "2026-09-01",
    };
    const dates = deriveReviewLifecycleDates(assignment, track);
    assert.equal(dates.scheduledDate, "2026-08-28");
    assert.equal(dates.completedDate, "2026-09-01");
    assert.equal(dates.cancelledDate, null);

    const meetings = coachMeetingsFromAssignments([assignment], [track]);
    assert.equal(meetings[0].scheduledDate, "2026-08-28");
    assert.equal(meetings[0].completedDate, "2026-09-01");
  });

  it("uses cancelledAt on cancelled prescription reviews", () => {
    const assignment = {
      id: "rx-2",
      date: "2026-10-15",
      reviewStatus: "cancelled",
      cancelledAt: "2026-10-18T09:00:00.000Z",
    };
    const dates = deriveReviewLifecycleDates(assignment, null);
    assert.equal(dates.cancelledDate, "2026-10-18");
    assert.equal(dates.completedDate, null);
  });
});

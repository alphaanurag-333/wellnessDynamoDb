const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveCounsellingInitiatedBy,
  resolveCounsellingSessionStatus,
  buildUserCounsellingReviewHistory,
} = require("../utils/counsellingReviewHistory");

describe("counselling review history", () => {
  it("marks client-requested tracks as client-initiated", () => {
    assert.equal(
      resolveCounsellingInitiatedBy({ status: "requested", periodOffers: [] }),
      "client",
    );
  });

  it("marks coach-scheduled tracks as coach-initiated", () => {
    assert.equal(
      resolveCounsellingInitiatedBy({
        initiatedByRole: "coach",
        status: "scheduled",
        scheduledAt: "2026-10-20T10:00:00.000Z",
      }),
      "coach",
    );
  });

  it("maps cancelled and completed states for mobile sessionStatus", () => {
    assert.equal(
      resolveCounsellingSessionStatus({ reviewStatus: "cancelled", cancelled: true }),
      "cancel",
    );
    assert.equal(
      resolveCounsellingSessionStatus({
        reviewStatus: "active",
        completedDate: "2026-09-01",
      }),
      "complete",
    );
    assert.equal(
      resolveCounsellingSessionStatus({ trackStatus: "requested" }),
      "pending",
    );
  });

  it("builds sessions with initiator and status for review-history", () => {
    const initiatorContext = {
      targetUser: { name: "Madhupriya S." },
      staffNameMap: new Map([["coach-1", "Dr. Ankit"]]),
    };
    const history = buildUserCounsellingReviewHistory({
      assignments: [
        {
          id: "rx-1",
          date: "2026-09-01",
          reviewStatus: "active",
          summary: "Protocol",
          completedDate: "2026-09-01",
          authorName: "Dr. Ankit",
        },
      ],
      meetings: [
        {
          id: "rx-1",
          date: "2026-09-01",
          reviewStatus: "active",
          summary: "Protocol",
          authorName: "Dr. Ankit",
          cancelled: false,
          completedDate: "2026-09-01",
        },
      ],
      tracks: [
        {
          id: "track-open",
          status: "scheduled",
          concern: "Follow up",
          scheduledAt: "2026-11-01T10:00:00.000Z",
          initiatedByRole: "client",
        },
      ],
      initiatorContext,
    });

    assert.equal(history.reviews[0].initiatedBy, "Dr. Ankit");
    assert.equal(history.reviews[0].initiatedByRole, "coach");
    assert.equal(history.reviews[0].sessionStatus, "complete");

    const pending = history.sessions.find((row) => row.id === "track-open");
    assert.ok(pending);
    assert.equal(pending.initiatedBy, "Madhupriya S.");
    assert.equal(pending.initiatedByRole, "client");
    assert.equal(pending.sessionStatus, "pending");
  });
});

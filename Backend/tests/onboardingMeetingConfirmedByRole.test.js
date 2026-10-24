const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeConfirmedByRole,
  toPublicOnboardingMeeting,
} = require("../models/onboardingMeetingModel");

describe("onboarding meeting confirmedByRole", () => {
  it("normalizes client-side roles to Client", () => {
    assert.equal(normalizeConfirmedByRole("Client"), "Client");
    assert.equal(normalizeConfirmedByRole("client"), "Client");
    assert.equal(normalizeConfirmedByRole("user"), "Client");
  });

  it("normalizes coach/staff roles to Coach", () => {
    assert.equal(normalizeConfirmedByRole("Coach"), "Coach");
    assert.equal(normalizeConfirmedByRole("coach"), "Coach");
    assert.equal(normalizeConfirmedByRole("wellness_coach"), "Coach");
    assert.equal(normalizeConfirmedByRole("admin"), "Coach");
  });

  it("exposes confirmedByRole on public meeting payloads", () => {
    const pub = toPublicOnboardingMeeting({
      id: "m1",
      userId: "u1",
      stepKey: "launch",
      status: "confirmed",
      confirmedByRole: "admin",
      confirmedStartAt: "2026-10-23T14:45:00.000Z",
      createdAt: "2026-10-23T10:00:00.000Z",
      updatedAt: "2026-10-23T10:00:00.000Z",
    });
    assert.equal(pub.confirmedByRole, "Coach");
    assert.equal(pub.confirmedStartAt, "2026-10-23T14:45:00.000Z");
  });

  it("returns empty confirmedByRole when meeting is not confirmed", () => {
    const pub = toPublicOnboardingMeeting({
      id: "m2",
      userId: "u1",
      stepKey: "hap",
      status: "slots_offered",
      slots: [{ id: "s1", startAt: "2026-10-23T14:00:00.000Z", endAt: "2026-10-23T15:00:00.000Z" }],
      createdAt: "2026-10-23T10:00:00.000Z",
      updatedAt: "2026-10-23T10:00:00.000Z",
    });
    assert.equal(pub.confirmedByRole, "");
  });

  it("infers Client for legacy multi-slot confirmations", () => {
    const pub = toPublicOnboardingMeeting({
      id: "m3",
      userId: "u1",
      stepKey: "launch",
      status: "confirmed",
      selectedSlotId: "s2",
      slots: [
        { id: "s1", startAt: "2026-10-23T14:00:00.000Z", endAt: "2026-10-23T15:00:00.000Z" },
        { id: "s2", startAt: "2026-10-23T16:00:00.000Z", endAt: "2026-10-23T17:00:00.000Z" },
      ],
      createdAt: "2026-10-23T10:00:00.000Z",
      updatedAt: "2026-10-23T10:00:00.000Z",
    });
    assert.equal(pub.confirmedByRole, "Client");
  });
});

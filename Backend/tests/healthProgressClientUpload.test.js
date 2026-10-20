const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveHealthProgressClientUpload,
  closeHealthProgressClientUpload,
  openHealthProgressClientUpload,
  isHealthProgressSaturday,
} = require("../utils/healthProgressHelpers");

const SATURDAY = new Date("2026-10-17T06:30:00.000Z");
const TUESDAY = new Date("2026-10-20T06:30:00.000Z");

describe("health progress client upload window", () => {
  it("knows Saturday in India time", () => {
    assert.equal(isHealthProgressSaturday(SATURDAY), true);
    assert.equal(isHealthProgressSaturday(TUESDAY), false);
  });

  it("opens on Saturday until the client has saved that day", () => {
    const fresh = resolveHealthProgressClientUpload(null, SATURDAY);
    assert.equal(fresh.windows.glucose.open, true);
    assert.equal(fresh.windows.glucose.source, "saturday");
    assert.equal(fresh.windows.weightPic.open, true);

    const closedLastWeek = resolveHealthProgressClientUpload({
      glucose: { open: false, closedAt: "2026-10-10T08:00:00.000Z", source: null },
    }, SATURDAY);
    assert.equal(closedLastWeek.windows.glucose.open, true);

    const closedToday = resolveHealthProgressClientUpload({
      glucose: { open: false, closedAt: "2026-10-17T04:00:00.000Z", source: null },
    }, SATURDAY);
    assert.equal(closedToday.windows.glucose.open, false);
  });

  it("stays closed on other days unless a coach opened it", () => {
    const closed = resolveHealthProgressClientUpload(null, TUESDAY);
    assert.equal(closed.windows.bloodPressure.open, false);

    const opened = resolveHealthProgressClientUpload(
      openHealthProgressClientUpload(null, "bloodPressure"),
      TUESDAY,
    );
    assert.equal(opened.windows.bloodPressure.open, true);
    assert.equal(opened.windows.bloodPressure.source, "coach");
  });

  it("closes after a client save and can be opened again", () => {
    const closed = closeHealthProgressClientUpload(null, "conditionComparison", SATURDAY);
    assert.equal(closed.conditionComparison.open, false);
    assert.equal(closed.conditionComparison.closedAt, SATURDAY.toISOString());

    const reopened = openHealthProgressClientUpload(closed, "conditionComparison");
    assert.equal(reopened.conditionComparison.open, true);
    assert.equal(reopened.conditionComparison.source, "coach");

    const stillClosedSameSaturday = resolveHealthProgressClientUpload(closed, SATURDAY);
    assert.equal(stillClosedSameSaturday.windows.conditionComparison.open, false);
  });
});

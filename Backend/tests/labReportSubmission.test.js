const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isLabReportSubmissionLocked, labReportSubmissionState } = require("../utils/labReportSubmission");

describe("isLabReportSubmissionLocked", () => {
  it("is locked for new clients until a coach enables upload", () => {
    assert.equal(isLabReportSubmissionLocked({}, { hasReports: false }), true);
    assert.equal(isLabReportSubmissionLocked(null, { hasReports: false }), true);
  });

  it("locks once a report exists and a coach has not re-opened it", () => {
    assert.equal(isLabReportSubmissionLocked({}, { hasReports: true }), true);
    assert.equal(isLabReportSubmissionLocked({ labReportSubmissionLocked: true }, { hasReports: false }), true);
  });

  it("stays open after a coach enables it, even if older reports exist", () => {
    assert.equal(
      isLabReportSubmissionLocked({ labReportSubmissionLocked: false }, { hasReports: true }),
      false
    );
  });
});

describe("labReportSubmissionState", () => {
  it("tells the mobile app when upload is disabled", () => {
    const locked = labReportSubmissionState({ labReportSubmissionLocked: true });
    assert.equal(locked.canSubmitLabReport, false);
    assert.equal(locked.submissionLocked, true);
    assert.equal(locked.submissionEnabled, false);
    assert.match(locked.submissionLockedMessage, /wellness coach/i);
  });

  it("tells the mobile app when upload is allowed", () => {
    const open = labReportSubmissionState({ labReportSubmissionLocked: false }, { hasReports: true });
    assert.equal(open.canSubmitLabReport, true);
    assert.equal(open.submissionLocked, false);
    assert.equal(open.submissionEnabled, true);
    assert.equal(open.submissionLockedMessage, null);
  });
});

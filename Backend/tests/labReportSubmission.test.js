const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isLabReportSubmissionLocked } = require("../utils/labReportSubmission");

describe("isLabReportSubmissionLocked", () => {
  it("stays open when the client has never submitted", () => {
    assert.equal(isLabReportSubmissionLocked({}, { hasReports: false }), false);
    assert.equal(isLabReportSubmissionLocked(null, { hasReports: false }), false);
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

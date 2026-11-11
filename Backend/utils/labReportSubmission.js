const LAB_REPORT_SUBMISSION_LOCKED_MESSAGE =
  "Your wellness coach can enable it.";

/**
 * Open when labReportSubmissionLocked is explicitly false (new clients default to open).
 * Missing/true means locked — coach can re-enable in Internal parameters after an upload auto-locks.
 */
function isLabReportSubmissionLocked(user, { hasReports = false } = {}) {
  if (user?.labReportSubmissionLocked === false) return false;
  return true;
}

function labReportSubmissionState(user, { hasReports = false } = {}) {
  const submissionLocked = isLabReportSubmissionLocked(user, { hasReports });
  return {
    labReportSubmissionLocked: submissionLocked,
    submissionLocked,
    submissionEnabled: !submissionLocked,
    canSubmitLabReport: !submissionLocked,
    submissionLockedMessage: submissionLocked ? LAB_REPORT_SUBMISSION_LOCKED_MESSAGE : null,
  };
}

module.exports = {
  LAB_REPORT_SUBMISSION_LOCKED_MESSAGE,
  isLabReportSubmissionLocked,
  labReportSubmissionState,
};

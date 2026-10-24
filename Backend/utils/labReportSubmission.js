const LAB_REPORT_SUBMISSION_LOCKED_MESSAGE =
  "Your wellness coach can enable it.";

/**
 * Locked by default for new clients until a coach enables upload in Internal parameters.
 * An explicit false means the coach allowed a new report in the app.
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

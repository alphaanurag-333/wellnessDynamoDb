const LAB_REPORT_SUBMISSION_LOCKED_MESSAGE =
  "Report submission is locked. Your wellness coach can enable it.";

/**
 * Missing flag on older accounts stays locked once a report exists.
 * An explicit false means a coach re-opened the submit panel.
 */
function isLabReportSubmissionLocked(user, { hasReports = false } = {}) {
  if (user?.labReportSubmissionLocked === true) return true;
  if (user?.labReportSubmissionLocked === false) return false;
  return Boolean(hasReports);
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

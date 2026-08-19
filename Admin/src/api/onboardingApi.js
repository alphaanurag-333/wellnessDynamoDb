import api, { normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import { adminListTestCatalog } from "./testCatalogApi.js";
import { adminGetLaunchConfig } from "./launchConfigApi.js";

function authHeader() {
  const token = getAccountToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function userPath(userId, suffix = "") {
  return `/account/users/${encodeURIComponent(userId)}${suffix}`;
}

export async function patchOnboardingStep(userId, stepKey, status) {
  try {
    const { data } = await api.patch(
      userPath(userId, `/onboarding-steps/${encodeURIComponent(stepKey)}`),
      { status },
      { headers: authHeader() },
    );
    return data.data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchOnboardingMeetings(userId) {
  try {
    const { data } = await api.get(userPath(userId, "/onboarding-meetings"), {
      headers: authHeader(),
    });
    return data.meetings || [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function createOnboardingMeetingSlots(userId, payload) {
  try {
    const { data } = await api.post(userPath(userId, "/onboarding-meetings"), payload, {
      headers: authHeader(),
    });
    return data.meeting;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function acceptOnboardingMeetingRequest(userId, meetingId) {
  try {
    const { data } = await api.post(
      userPath(userId, `/onboarding-meetings/${encodeURIComponent(meetingId)}/accept-request`),
      {},
      { headers: authHeader() },
    );
    return data.meeting;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function rejectOnboardingMeetingRequest(userId, meetingId) {
  try {
    const { data } = await api.post(
      userPath(userId, `/onboarding-meetings/${encodeURIComponent(meetingId)}/reject-request`),
      {},
      { headers: authHeader() },
    );
    return data.meeting;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function cancelOnboardingMeeting(userId, meetingId) {
  try {
    const { data } = await api.post(
      userPath(userId, `/onboarding-meetings/${encodeURIComponent(meetingId)}/cancel`),
      {},
      { headers: authHeader() },
    );
    return data.meeting;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchCalendarOnboardingMeetings() {
  try {
    const { data } = await api.get("/account/onboarding-meetings", {
      headers: authHeader(),
    });
    return data.meetings || [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUserRca(userId) {
  try {
    const { data } = await api.get(`/account/heal-users/${encodeURIComponent(userId)}/rca`, {
      headers: authHeader(),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function submitUserRca(userId, { notes, file }) {
  try {
    const form = new FormData();
    form.append("notes", notes);
    if (file) form.append("file", file);
    const { data } = await api.post(
      `/account/heal-users/${encodeURIComponent(userId)}/rca`,
      form,
      { headers: { ...authHeader(), "Content-Type": "multipart/form-data" } },
    );
    return data.rca;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUserCommitmentLetter(userId) {
  try {
    const { data } = await api.get(
      `/account/heal-users/${encodeURIComponent(userId)}/commitment-letter`,
      { headers: authHeader() },
    );
    return data.commitmentLetter || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function reviewUserCommitmentLetter(userId, letterId, { action, rejectionReason } = {}) {
  try {
    const { data } = await api.patch(
      `/account/heal-users/${encodeURIComponent(userId)}/commitment-letter/${encodeURIComponent(letterId)}/review`,
      { action, rejectionReason },
      { headers: authHeader() },
    );
    return data.commitmentLetter;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function reviewUserPresentablePic(userId, { action } = {}) {
  try {
    const { data } = await api.patch(
      `/account/heal-users/${encodeURIComponent(userId)}/presentable-pic/review`,
      { action },
      { headers: authHeader() },
    );
    return data.user;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUserProtocol(userId) {
  try {
    const { data } = await api.get(`/account/heal-users/${encodeURIComponent(userId)}/protocol`, {
      headers: authHeader(),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveUserProtocol(userId, points) {
  try {
    const { data } = await api.post(
      `/account/heal-users/${encodeURIComponent(userId)}/protocol`,
      { points },
      { headers: authHeader() },
    );
    return data.protocol;
  } catch (error) {
    normalizeApiError(error);
  }
}

function mapTestRecommendation(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  return {
    id: String(id),
    userId: String(row.userId || ""),
    reportDate: String(row.reportDate || "").trim(),
    tests: Array.isArray(row.tests) ? row.tests : [],
    pdfUrl: row.pdfUrl || "",
    createdByRole: String(row.createdByRole || "").trim(),
    createdById: String(row.createdById || "").trim(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function fetchUserTestRecommendations(userId) {
  try {
    const { data } = await api.get(
      `/account/heal-users/${encodeURIComponent(userId)}/test-recommendations`,
      { headers: authHeader() },
    );
    const recommendations = (Array.isArray(data.recommendations) ? data.recommendations : [])
      .map(mapTestRecommendation)
      .filter(Boolean);
    const recommended =
      mapTestRecommendation(data.recommended || data.recommendation) || recommendations[0] || null;
    const historyRaw = Array.isArray(data.history) ? data.history : recommendations.slice(1);
    return {
      recommended,
      history: historyRaw.map(mapTestRecommendation).filter(Boolean),
      recommendations,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function downloadUserTestRecommendationPdf(userId, recommendationId) {
  try {
    const { data } = await api.get(
      `/account/heal-users/${encodeURIComponent(userId)}/test-recommendations/${encodeURIComponent(recommendationId)}/pdf`,
      { headers: authHeader(), responseType: "blob" },
    );
    if (data instanceof Blob && data.type && data.type.includes("json")) {
      const parsed = JSON.parse(await data.text());
      throw new Error(parsed?.message || parsed?.error || "Failed to download list");
    }
    return data;
  } catch (error) {
    if (error?.status || (error instanceof Error && !error.response)) {
      throw error;
    }
    const blob = error?.response?.data;
    if (blob instanceof Blob) {
      try {
        const parsed = JSON.parse(await blob.text());
        const err = new Error(parsed?.message || parsed?.error || "Failed to download list");
        err.status = error?.response?.status;
        throw err;
      } catch (inner) {
        if (inner?.status) throw inner;
      }
    }
    normalizeApiError(error);
  }
}

export async function createUserTestRecommendation(userId, payload) {
  try {
    const { data } = await api.post(
      `/account/heal-users/${encodeURIComponent(userId)}/test-recommendations`,
      payload,
      { headers: authHeader() },
    );
    return data.recommended || data.recommendation;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUserLabReports(userId) {
  try {
    const { data } = await api.get(
      `/account/heal-users/${encodeURIComponent(userId)}/lab-reports`,
      { headers: authHeader() },
    );
    return data.reports || [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function reviewUserLabReport(userId, reportId) {
  try {
    const { data } = await api.patch(
      `/account/heal-users/${encodeURIComponent(userId)}/lab-reports/${encodeURIComponent(reportId)}/review`,
      {},
      { headers: authHeader() },
    );
    return data.report;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function analyzeUserLabReport(userId, reportId) {
  try {
    const { data } = await api.post(
      `/account/heal-users/${encodeURIComponent(userId)}/lab-reports/${encodeURIComponent(reportId)}/analyze`,
      {},
      { headers: authHeader(), timeout: 120000 },
    );
    return data.report;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updateUserLabReportAnalysis(userId, reportId, payload) {
  try {
    const { data } = await api.patch(
      `/account/heal-users/${encodeURIComponent(userId)}/lab-reports/${encodeURIComponent(reportId)}/ai-analysis`,
      payload,
      { headers: authHeader() },
    );
    return data.report;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUserLaunchAssessments(userId) {
  try {
    const { data } = await api.get(
      `/account/heal-users/${encodeURIComponent(userId)}/launch-assessment`,
      { headers: authHeader() },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchLaunchAssessmentConfig(userId) {
  function mapConfig(data) {
    return {
      ratings: Array.isArray(data?.ratings) ? data.ratings : [],
      domains: Array.isArray(data?.domains) ? data.domains : [],
      scoring: data?.scoring || null,
    };
  }

  try {
    const data = await adminGetLaunchConfig(null);
    if ((data?.domains || []).length || (data?.ratings || []).length) return data;
  } catch {
    // Coaches may lack Configs permission — fall through to the client-hub catalog.
  }

  if (userId) {
    try {
      const { data } = await api.get(
        `/account/heal-users/${encodeURIComponent(userId)}/launch-assessment/config`,
        { headers: authHeader() },
      );
      const mapped = mapConfig(data);
      if (mapped.domains.length || mapped.ratings.length) return mapped;
    } catch {
      // User may be outside this coach's roster; catalog is still global.
    }
  }

  try {
    const { data } = await api.get("/account/launch-config", {
      headers: authHeader(),
    });
    return mapConfig(data);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchLaunchQuestions(userId) {
  try {
    const { data } = await api.get(
      `/account/heal-users/${encodeURIComponent(userId)}/launch-assessment/questions`,
      { headers: authHeader() },
    );
    return data.questions || data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchLaunchFocusAreas(userId) {
  try {
    const { data } = await api.get(
      `/account/heal-users/${encodeURIComponent(userId)}/launch-assessment/focus-areas`,
      { params: { limit: 50 }, headers: authHeader() },
    );
    return data.focusAreas || data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveUserLaunchAssessment(userId, payload) {
  try {
    const { data } = await api.post(
      `/account/heal-users/${encodeURIComponent(userId)}/launch-assessment`,
      payload,
      { headers: authHeader() },
    );
    return data.assessment;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updateUserLaunchAssessment(userId, assessmentId, payload) {
  try {
    const { data } = await api.patch(
      `/account/heal-users/${encodeURIComponent(userId)}/launch-assessment/${encodeURIComponent(assessmentId)}`,
      payload,
      { headers: authHeader() },
    );
    return data.assessment;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUserPrakrutiAssessment(userId) {
  try {
    const { data } = await api.get(
      `/account/heal-users/${encodeURIComponent(userId)}/prakruti-assessment`,
      { headers: authHeader() },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchPrakrutiQuestions(userId) {
  try {
    const { data } = await api.get(
      `/account/heal-users/${encodeURIComponent(userId)}/prakruti-assessment/questions`,
      { params: { limit: 200 }, headers: authHeader() },
    );
    return data.questions || [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchPrakrutiThingsToAvoid(userId) {
  try {
    const { data } = await api.get(
      `/account/heal-users/${encodeURIComponent(userId)}/prakruti-assessment/things-to-avoid`,
      { params: { limit: 200 }, headers: authHeader() },
    );
    return data.thingsToAvoid || [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchPrakrutiRecommendations(userId, prakrutiType) {
  try {
    const { data } = await api.get(
      `/account/heal-users/${encodeURIComponent(userId)}/prakruti-assessment/recommendations`,
      { params: { prakrutiType }, headers: authHeader() },
    );
    return data.recommendations || [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveUserPrakrutiAssessment(userId, payload) {
  try {
    const { data } = await api.post(
      `/account/heal-users/${encodeURIComponent(userId)}/prakruti-assessment`,
      payload,
      { headers: authHeader() },
    );
    return data.assessment;
  } catch (error) {
    normalizeApiError(error);
  }
}

function liveCatalogRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      id: row.id || row._id,
      testId: row.testId,
      name: row.name,
      type: row.type,
      category: row.category || "Other",
      status: row.status === "inactive" ? "inactive" : "active",
      parameters: Array.isArray(row.parameters) ? row.parameters : [],
    }))
    .filter((row) => row.id && row.status !== "inactive");
}

async function listConfigsTestCatalog() {
  const first = await adminListTestCatalog(null, { page: 1, limit: 200 });
  const tests = liveCatalogRows(first?.tests);
  const pages = Math.max(1, Number(first?.pagination?.pages) || 1);
  if (pages <= 1) return tests;

  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) =>
      adminListTestCatalog(null, { page: index + 2, limit: 200 }),
    ),
  );
  return tests.concat(...rest.map((page) => liveCatalogRows(page?.tests)));
}

export async function fetchTestCatalog(userId) {
  // Same list Configs → Blood test catalog uses. Do this first so assignment
  // cannot go empty while the master catalog has live tests.
  try {
    const tests = await listConfigsTestCatalog();
    if (tests.length) return tests;
  } catch {
    // Coaches may lack Configs permission — try the client-scoped catalog.
  }

  if (userId) {
    try {
      const { data } = await api.get(
        `/account/heal-users/${encodeURIComponent(userId)}/test-catalog`,
        { headers: authHeader() },
      );
      const tests = liveCatalogRows(data.tests);
      if (tests.length) return tests;
    } catch {
      // Fall through and surface the Configs error if both fail.
    }
  }

  try {
    return await listConfigsTestCatalog();
  } catch (error) {
    normalizeApiError(error);
  }
}

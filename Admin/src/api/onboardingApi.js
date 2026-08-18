import api, { normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import { adminListTestCatalog } from "./testCatalogApi.js";

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

export async function fetchUserTestRecommendations(userId) {
  try {
    const { data } = await api.get(
      `/account/heal-users/${encodeURIComponent(userId)}/test-recommendations`,
      { headers: authHeader() },
    );
    return data;
  } catch (error) {
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
      { headers: authHeader() },
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

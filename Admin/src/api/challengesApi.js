import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function base() {
  return "/admin/challenges";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

export const ONBOARDING_STEP_LABELS = {
  personalDetails: "Personal details",
  bodyAnalytics: "Body analytics",
  internalParameter: "Internal parameters",
  launch: "LAUNCH",
  rca: "RCA",
  reportsBriefing: "Reports briefing",
  hap: "HAP",
  protocolSettings: "Protocol settings",
  commitmentLetter: "Commitment letter",
  programInitiation: "Program initiation",
};

export function mapChallenge(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  return {
    id,
    title: String(row.title || "").trim(),
    description: String(row.description || "").trim(),
    price: Number(row.price) || 0,
    currency: row.currency || "INR",
    images: Array.isArray(row.images) ? row.images : [],
    startDate: row.startDate || "",
    endDate: row.endDate || "",
    status: row.status || "draft",
    onboardingStepKeys: Array.isArray(row.onboardingStepKeys) ? row.onboardingStepKeys : [],
    whatsappMessageTemplate: row.whatsappMessageTemplate || "",
    maxGroupSize: Number(row.maxGroupSize) || 20,
    enrollmentCount: Number(row.enrollmentCount) || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function adminListChallenges(token, { page = 1, limit = 50, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search) q.set("search", search);
  try {
    const { data } = await api.get(`${base()}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    return {
      items: (data.challenges || []).map(mapChallenge).filter(Boolean),
      pagination: data.pagination,
      onboardingStepOptions: data.onboardingStepOptions || Object.keys(ONBOARDING_STEP_LABELS),
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateChallenge(token, fields, imageFiles = []) {
  const headers = authHeader(tokenOrStored(token));
  const fd = new FormData();
  fd.append("title", String(fields.title || "").trim());
  fd.append("description", String(fields.description || "").trim());
  fd.append("price", String(fields.price || 0));
  fd.append("startDate", String(fields.startDate || ""));
  fd.append("endDate", String(fields.endDate || ""));
  fd.append("status", String(fields.status || "draft"));
  fd.append("whatsappMessageTemplate", String(fields.whatsappMessageTemplate || ""));
  fd.append("maxGroupSize", String(fields.maxGroupSize || 20));
  fd.append("onboardingStepKeys", JSON.stringify(fields.onboardingStepKeys || []));
  if (Array.isArray(fields.images)) {
    fd.append("images", JSON.stringify(fields.images));
  }
  for (const file of imageFiles || []) {
    if (file instanceof File) fd.append("images", file);
  }
  try {
    const { data } = await api.post(base(), fd, { headers });
    return mapChallenge(data.challenge);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateChallenge(token, id, fields, imageFiles = []) {
  const headers = authHeader(tokenOrStored(token));
  const fd = new FormData();
  if (fields.title !== undefined) fd.append("title", String(fields.title || "").trim());
  if (fields.description !== undefined) fd.append("description", String(fields.description || "").trim());
  if (fields.price !== undefined) fd.append("price", String(fields.price || 0));
  if (fields.startDate !== undefined) fd.append("startDate", String(fields.startDate || ""));
  if (fields.endDate !== undefined) fd.append("endDate", String(fields.endDate || ""));
  if (fields.status !== undefined) fd.append("status", String(fields.status || "draft"));
  if (fields.whatsappMessageTemplate !== undefined) {
    fd.append("whatsappMessageTemplate", String(fields.whatsappMessageTemplate || ""));
  }
  if (fields.maxGroupSize !== undefined) fd.append("maxGroupSize", String(fields.maxGroupSize || 20));
  if (fields.onboardingStepKeys !== undefined) {
    fd.append("onboardingStepKeys", JSON.stringify(fields.onboardingStepKeys || []));
  }
  if (fields.images !== undefined) fd.append("images", JSON.stringify(fields.images || []));
  for (const file of imageFiles || []) {
    if (file instanceof File) fd.append("images", file);
  }
  try {
    const { data } = await api.patch(`${base()}/${id}`, fd, { headers });
    return mapChallenge(data.challenge);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteChallenge(token, id) {
  try {
    await api.delete(`${base()}/${id}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListChallengeEnrollments(token, challengeId, { page = 1, limit = 50 } = {}) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  try {
    const { data } = await api.get(`${base()}/${challengeId}/enrollments?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    return {
      enrollments: data.enrollments || [],
      pagination: data.pagination,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminAssignEnrollment(token, challengeId, enrollmentId, fields) {
  try {
    const { data } = await api.patch(
      `${base()}/${challengeId}/enrollments/${enrollmentId}`,
      fields,
      { headers: authHeader(tokenOrStored(token)) }
    );
    return data.enrollment;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListChallengeGroups(token, challengeId) {
  try {
    const { data } = await api.get(`${base()}/${challengeId}/groups`, {
      headers: authHeader(tokenOrStored(token)),
    });
    return data.groups || [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateChallengeGroup(token, challengeId, fields) {
  try {
    const { data } = await api.post(`${base()}/${challengeId}/groups`, fields, {
      headers: authHeader(tokenOrStored(token)),
    });
    return data.group;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminRunChallengeLifecycleJob(token) {
  try {
    const { data } = await api.post(
      `${base()}/jobs/run`,
      {},
      { headers: authHeader(tokenOrStored(token)) }
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

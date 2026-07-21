import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/commitment-letters";
}

export async function adminListCommitmentLetters(token, { page = 1, limit = 20, approvalStatus, search } = {}) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (approvalStatus) q.set("approvalStatus", approvalStatus);
  if (search?.trim()) q.set("search", search.trim());
  try {
    const { data } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      commitmentLetters: Array.isArray(data.commitmentLetters) ? data.commitmentLetters : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListPendingCommitmentLetters(token) {
  try {
    const { data } = await api.get(`${base()}/pending`, { headers: authHeader(token) });
    return Array.isArray(data.commitmentLetters) ? data.commitmentLetters : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminReviewCommitmentLetter(token, id, { action, rejectionReason } = {}) {
  try {
    const { data } = await api.patch(
      `${base()}/${encodeURIComponent(id)}/review`,
      { action, rejectionReason },
      { headers: authHeader(token) }
    );
    return data.commitmentLetter;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetUserCommitmentLetter(token, userId) {
  try {
    const { data } = await api.get(
      `/admin/heal-users/${encodeURIComponent(userId)}/commitment-letter`,
      { headers: authHeader(token) }
    );
    return data.commitmentLetter ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteCommitmentLetter(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}

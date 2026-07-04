import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/commitment-letters";
}

export async function adminListCommitmentLetters(
  token,
  { page = 1, limit = 10, approvalStatus, search, userId } = {}
) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (approvalStatus) q.set("approvalStatus", approvalStatus);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (userId) q.set("userId", String(userId));
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

export async function adminGetCommitmentLetterById(token, id) {
  try {
    const { data } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return data.commitmentLetter ?? null;
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

export async function adminDeleteCommitmentLetter(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}

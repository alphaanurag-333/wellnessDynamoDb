import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function base() {
  return "/assistant/commitment-letters";
}

export async function assistantListCommitmentLetters(token, { page = 1, limit = 20, approvalStatus, search } = {}) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (approvalStatus) q.set("approvalStatus", approvalStatus);
  if (search?.trim()) q.set("search", search.trim());
  try {
    const { data } = await assistantApi.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      commitmentLetters: Array.isArray(data.commitmentLetters) ? data.commitmentLetters : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantListPendingCommitmentLetters(token) {
  try {
    const { data } = await assistantApi.get(`${base()}/pending`, { headers: authHeader(token) });
    return Array.isArray(data.commitmentLetters) ? data.commitmentLetters : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantReviewCommitmentLetter(token, id, { action, rejectionReason } = {}) {
  try {
    const { data } = await assistantApi.patch(
      `${base()}/${encodeURIComponent(id)}/review`,
      { action, rejectionReason },
      { headers: authHeader(token) }
    );
    return data.commitmentLetter;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantGetUserCommitmentLetter(token, userId) {
  try {
    const { data } = await assistantApi.get(
      `/assistant/heal-users/${encodeURIComponent(userId)}/commitment-letter`,
      { headers: authHeader(token) }
    );
    return data.commitmentLetter ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantDeleteCommitmentLetter(token, id) {
  try {
    await assistantApi.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}

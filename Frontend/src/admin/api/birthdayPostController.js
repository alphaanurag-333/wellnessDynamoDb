import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/birthday-posts";
}

export async function adminListBirthdayPosts(token, { page = 1, limit = 10, status, postDate } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (postDate) q.set("postDate", postDate);
  try {
    const { data } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      birthdayPosts: data.birthdayPosts ?? [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetBirthdayPostById(token, id) {
  try {
    const { data } = await api.get(`${base()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return {
      birthdayPost: data.birthdayPost,
      notification: data.notification,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateBirthdayPost(token, id, fields) {
  try {
    const { data } = await api.patch(`${base()}/${encodeURIComponent(id)}`, fields, {
      headers: authHeader(token),
    });
    return data.birthdayPost;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteBirthdayPostComment(token, postId, commentId) {
  try {
    await api.delete(
      `${base()}/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      { headers: authHeader(token) }
    );
  } catch (error) {
    normalizeApiError(error);
  }
}

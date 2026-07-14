import api, { authHeader, normalizeApiError } from "../../api.js";

function leadershipNotesBase() {
  return "/admin/leadership-notes";
}

export async function adminListLeadershipNotes(token, { page = 1, limit = 10, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", String(status));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${leadershipNotesBase()}?${q}`, { headers: authHeader(token) });
    return {
      leadershipNotes: Array.isArray(data.leadershipNotes) ? data.leadershipNotes : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetLeadershipNoteById(token, id) {
  try {
    const { data } = await api.get(`${leadershipNotesBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.leadershipNote ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

function appendCommonFields(fd, fields) {
  if (fields.name !== undefined) fd.append("name", String(fields.name ?? "").trim());
  if (fields.designation !== undefined) fd.append("designation", String(fields.designation ?? "").trim());
  if (fields.title !== undefined) fd.append("title", String(fields.title ?? "").trim());
  if (fields.badge !== undefined) fd.append("badge", String(fields.badge ?? "").trim());
  if (fields.message !== undefined) fd.append("message", String(fields.message ?? "").trim());
  if (fields.status !== undefined) fd.append("status", String(fields.status ?? "active").trim());
}

export async function adminCreateLeadershipNote(token, fields) {
  if (!(fields?.file instanceof File)) {
    throw new Error("Profile image upload file is required.");
  }
  const fd = new FormData();
  appendCommonFields(fd, fields);
  fd.append("file", fields.file);
  try {
    const { data } = await api.post(leadershipNotesBase(), fd, { headers: authHeader(token) });
    return data.leadershipNote;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateLeadershipNote(token, id, fields) {
  if (fields?.file instanceof File) {
    const fd = new FormData();
    appendCommonFields(fd, fields);
    fd.append("file", fields.file);
    try {
      const { data } = await api.patch(`${leadershipNotesBase()}/${encodeURIComponent(id)}`, fd, {
        headers: authHeader(token),
      });
      return data.leadershipNote;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  const payload = {};
  if (fields?.name !== undefined) payload.name = String(fields.name).trim();
  if (fields?.designation !== undefined) payload.designation = String(fields.designation).trim();
  if (fields?.title !== undefined) payload.title = String(fields.title).trim();
  if (fields?.badge !== undefined) payload.badge = String(fields.badge).trim();
  if (fields?.message !== undefined) payload.message = String(fields.message).trim();
  if (fields?.status !== undefined) payload.status = String(fields.status).trim();

  try {
    const { data } = await api.patch(`${leadershipNotesBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return data.leadershipNote;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteLeadershipNote(token, id) {
  try {
    await api.delete(`${leadershipNotesBase()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}

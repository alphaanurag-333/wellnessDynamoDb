import api, { authHeader, normalizeApiError } from "../../api.js";

function contactInquiryBase() {
  return "/admin/contact-inquiries";
}

export async function adminListContactInquiries(
  token,
  { page = 1, limit = 20, status, search, inquiryType } = {}
) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (inquiryType) q.set("inquiryType", inquiryType);

  try {
    const { data } = await api.get(`${contactInquiryBase()}?${q}`, { headers: authHeader(token) });
    return {
      contactInquiries: Array.isArray(data.contactInquiries) ? data.contactInquiries : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetContactInquiryById(token, id) {
  try {
    const { data } = await api.get(`${contactInquiryBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.contactInquiry;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateContactInquiry(token, id, fields) {
  const payload = {};
  if (fields.status !== undefined) payload.status = String(fields.status);

  try {
    const { data } = await api.patch(`${contactInquiryBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return data.contactInquiry;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteContactInquiry(token, id) {
  try {
    await api.delete(`${contactInquiryBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

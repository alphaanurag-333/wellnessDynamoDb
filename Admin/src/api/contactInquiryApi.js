import api, { normalizeApiError } from "../api.js";

function inquiriesBase() {
  return "/account/contact-inquiries";
}

export const INQUIRY_TYPE_OPTIONS = [
  { id: "consultation", label: "Book Consultation" },
  { id: "program", label: "Health Program" },
  { id: "appointment", label: "Appointment" },
  { id: "general", label: "General Enquiry" },
];

export const INQUIRY_STATUS_OPTIONS = [
  { id: "new", label: "New" },
  { id: "read", label: "Read" },
  { id: "archived", label: "Archived" },
];

export function inquiryTypeLabel(value) {
  const key = String(value || "").trim().toLowerCase();
  return INQUIRY_TYPE_OPTIONS.find((row) => row.id === key)?.label || value || "—";
}

export function inquiryStatusLabel(value) {
  const key = String(value || "").trim().toLowerCase();
  return INQUIRY_STATUS_OPTIONS.find((row) => row.id === key)?.label || value || "—";
}

export function inquiryFullName(row) {
  return [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim() || "—";
}

export async function listContactInquiries({
  page = 1,
  limit = 20,
  status,
  search,
  inquiryType,
} = {}) {
  const params = { page, limit };
  if (status) params.status = status;
  if (search) params.search = search;
  if (inquiryType) params.inquiryType = inquiryType;
  try {
    const { data } = await api.get(inquiriesBase(), { params });
    return {
      contactInquiries: Array.isArray(data?.contactInquiries) ? data.contactInquiries : [],
      pagination: data?.pagination || { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function getContactInquiry(id) {
  try {
    const { data } = await api.get(`${inquiriesBase()}/${encodeURIComponent(id)}`);
    return data?.contactInquiry || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updateContactInquiryStatus(id, status) {
  try {
    const { data } = await api.patch(`${inquiriesBase()}/${encodeURIComponent(id)}`, { status });
    return data?.contactInquiry || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deleteContactInquiry(id) {
  try {
    await api.delete(`${inquiriesBase()}/${encodeURIComponent(id)}`);
  } catch (error) {
    normalizeApiError(error);
  }
}

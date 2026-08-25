import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function tokenOrStored(token) {
  return token || getAccountToken();
}

function catalogBase() {
  return "/account/wellness-prescriptions";
}

function assignmentsBase(userId) {
  return `/account/heal-users/${encodeURIComponent(userId)}/wellness-prescriptions`;
}

export function mapRxCatalogProtocol(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const points = (Array.isArray(row.points) ? row.points : [])
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  return {
    id: String(id),
    prescriptionId: String(row.prescriptionId || "").trim(),
    title: String(row.title || "").trim(),
    category: String(row.category || "").trim(),
    points,
    status: String(row.status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
  };
}

export function groupAssignmentItems(items, catalog = []) {
  const catalogBySlug = new Map();
  const catalogById = new Map();
  for (const row of catalog) {
    if (row?.prescriptionId) catalogBySlug.set(String(row.prescriptionId), row);
    if (row?.id) catalogById.set(String(row.id), row);
  }

  const sections = [];
  for (const item of Array.isArray(items) ? items : []) {
    const text = String(item?.text || "").trim();
    if (!text) continue;
    const prescriptionId = String(item?.prescriptionId || "").trim();
    const titleHint = String(item?.title || "").trim();
    const last = sections[sections.length - 1];
    const sameGroup =
      last &&
      String(last.prescriptionId || "") === prescriptionId &&
      (!titleHint || last.title === titleHint);

    if (sameGroup) {
      last.points.push(text);
      continue;
    }

    const catalogEntry = prescriptionId
      ? catalogBySlug.get(prescriptionId) || catalogById.get(prescriptionId)
      : null;

    sections.push({
      id: `${prescriptionId || "custom"}-${sections.length}`,
      catalogId: catalogEntry?.id || null,
      prescriptionId: prescriptionId || null,
      title: titleHint || catalogEntry?.title || (prescriptionId ? prescriptionId : "Custom protocol"),
      points: [text],
    });
  }
  return sections;
}

export function mapWellnessPrescriptionAssignment(row, catalog = []) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const sections = groupAssignmentItems(row.items, catalog);
  const canEdit = row.canEdit === true
    || (row.editableUntil
      ? new Date(row.editableUntil).getTime() > Date.now()
      : false);
  return {
    id: String(id),
    userId: String(row.userId || ""),
    coachId: String(row.coachId || ""),
    date: String(row.date || "").trim(),
    items: Array.isArray(row.items) ? row.items : [],
    sections,
    sourcePrescriptionIds: Array.isArray(row.sourcePrescriptionIds) ? row.sourcePrescriptionIds : [],
    createdByRole: String(row.createdByRole || "").trim(),
    createdById: String(row.createdById || "").trim(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    editableUntil: row.editableUntil || null,
    canEdit,
  };
}

export async function listActiveWellnessPrescriptionPool({ limit = 200, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", "1");
  q.set("limit", String(limit));
  q.set("status", "active");
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${catalogBase()}?${q}`, {
      headers: authHeader(tokenOrStored()),
    });
    const protocols = (Array.isArray(data.prescriptions) ? data.prescriptions : [])
      .map(mapRxCatalogProtocol)
      .filter(Boolean);
    return {
      protocols,
      pagination: data.pagination ?? { page: 1, limit, total: protocols.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function listUserWellnessPrescriptions(userId, catalog = []) {
  try {
    const { data } = await api.get(assignmentsBase(userId), {
      headers: authHeader(tokenOrStored()),
    });
    const assignments = (Array.isArray(data.assignments) ? data.assignments : [])
      .map((row) => mapWellnessPrescriptionAssignment(row, catalog))
      .filter(Boolean);
    const historyRaw = Array.isArray(data.history) ? data.history : [];
    return {
      assignments,
      recommended: mapWellnessPrescriptionAssignment(data.recommended, catalog) || assignments[0] || null,
      history: historyRaw.length
        ? historyRaw.map((row) => mapWellnessPrescriptionAssignment(row, catalog)).filter(Boolean)
        : assignments.slice(1),
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assignUserWellnessPrescription(userId, { date, protocols } = {}) {
  try {
    const { data } = await api.post(
      assignmentsBase(userId),
      {
        date,
        protocols: (Array.isArray(protocols) ? protocols : []).map((protocol) => ({
          catalogId: protocol.catalogId || undefined,
          title: protocol.title,
          points: Array.isArray(protocol.points) ? protocol.points : [],
        })),
      },
      { headers: authHeader(tokenOrStored()) },
    );
    return mapWellnessPrescriptionAssignment(data.assignment);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function republishUserWellnessPrescription(userId, assignmentId, { date, protocols } = {}) {
  try {
    const { data } = await api.put(
      `${assignmentsBase(userId)}/${encodeURIComponent(assignmentId)}`,
      {
        date,
        protocols: (Array.isArray(protocols) ? protocols : []).map((protocol) => ({
          catalogId: protocol.catalogId || undefined,
          title: protocol.title,
          points: Array.isArray(protocol.points) ? protocol.points : [],
        })),
      },
      { headers: authHeader(tokenOrStored()) },
    );
    return mapWellnessPrescriptionAssignment(data.assignment);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deleteUserWellnessPrescription(userId, assignmentId) {
  try {
    await api.delete(`${assignmentsBase(userId)}/${encodeURIComponent(assignmentId)}`, {
      headers: authHeader(tokenOrStored()),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

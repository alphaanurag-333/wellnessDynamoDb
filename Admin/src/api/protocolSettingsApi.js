import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import {
  formatProtocolSavedAt,
  historyDeltaLabel,
  pointCountLabel,
} from "../data/protocolSettingsData.js";

function tokenOrStored(token) {
  return token || getAccountToken();
}

function protocolBase(userId) {
  return `/account/heal-users/${encodeURIComponent(userId)}/protocol-settings`;
}

function savedByLabel(row) {
  const role = String(row?.savedByRole || "").toLowerCase();
  const name = String(row?.savedByName || "").trim();
  if (role === "admin") return "Admin desk";
  if (name) return name;
  if (role === "wellness_coach") return "Wellness coach";
  if (role === "assistant_wellness_coach") return "Assistant coach";
  return "Staff";
}

function mapProtocolSections(row) {
  if (Array.isArray(row?.sections) && row.sections.length) {
    return row.sections
      .map((section, index) => ({
        id: String(section?.id || `${row.id || row._id || "section"}-${index}`),
        heading: String(section?.heading || section?.title || "").trim(),
        points: (Array.isArray(section?.points) ? section.points : [])
          .map((point) => String(point || "").trim())
          .filter(Boolean),
      }))
      .filter((section) => section.heading || section.points.length);
  }

  const points = (Array.isArray(row?.points) ? row.points : [])
    .map((point) => String(point || "").trim())
    .filter(Boolean);
  if (!points.length) return [];
  return [{
    id: `${row?.id || row?._id || "legacy"}-section`,
    heading: "Protocol",
    points,
  }];
}

export function mapProtocolVersion(row, previousCount = 0) {
  if (!row) return null;
  const id = row.id || row._id;
  const sections = mapProtocolSections(row);
  const points = sections.flatMap((section) => section.points);
  const version = Number(row.version) || 0;
  if (!id && !version) return null;
  const createdAt = row.createdAt || "";
  const savedDate = createdAt ? new Date(createdAt) : null;
  return {
    id: String(id || `v${version}`),
    version,
    sections,
    points,
    savedAt: savedDate && !Number.isNaN(savedDate.getTime()) ? formatProtocolSavedAt(savedDate) : "",
    savedByLabel: savedByLabel(row),
    deltaLabel: historyDeltaLabel(points.length, previousCount),
    createdAt,
  };
}

function mapHistory(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list
    .map((row, index) => {
      const previousCount = list[index + 1]?.points?.length ?? 0;
      return mapProtocolVersion(row, previousCount);
    })
    .filter(Boolean);
}

export async function fetchUserProtocolSettings(userId) {
  try {
    const { data } = await api.get(protocolBase(userId), {
      headers: authHeader(tokenOrStored()),
    });
    const history = mapHistory(data.history);
    const current = mapProtocolVersion(
      data.current,
      history[1]?.points.length ?? 0
    ) || history[0] || null;
    return { current, history };
  } catch (error) {
    normalizeApiError(error);
  }
}

function sectionsBody(sections) {
  return {
    sections: (Array.isArray(sections) ? sections : []).map((section) => ({
      id: section?.id || undefined,
      heading: String(section?.heading || "").trim(),
      points: (Array.isArray(section?.points) ? section.points : [])
        .map((point) => String(point || "").trim())
        .filter(Boolean),
    })),
  };
}

export async function saveUserProtocolSettings(userId, sections) {
  try {
    const { data } = await api.post(
      protocolBase(userId),
      sectionsBody(sections),
      { headers: authHeader(tokenOrStored()) },
    );
    return mapProtocolPayload(data);
  } catch (error) {
    normalizeApiError(error);
  }
}

function mapProtocolPayload(data) {
  const history = mapHistory(data.history);
  const current = mapProtocolVersion(
    data.current,
    history[1]?.points.length ?? 0
  ) || history[0] || null;
  return { current, history };
}

function isMissingUpdateRoute(error) {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.message || "");
  return status === 404 && /route not found/i.test(message);
}

export async function updateUserProtocolSettings(userId, versionId, sections) {
  try {
    const { data } = await api.put(
      `${protocolBase(userId)}/${encodeURIComponent(versionId)}`,
      sectionsBody(sections),
      { headers: authHeader(tokenOrStored()) },
    );
    return mapProtocolPayload(data);
  } catch (error) {
    if (!isMissingUpdateRoute(error)) normalizeApiError(error);
  }

  // The live API has no in-place update. Write the edited copy, then remove the
  // previous version so History keeps one card for this save.
  const created = await saveUserProtocolSettings(userId, sections);
  const removed = await deleteUserProtocolSettings(userId, versionId);
  return removed || created;
}

export async function deleteUserProtocolSettings(userId, versionId) {
  try {
    const { data } = await api.delete(
      `${protocolBase(userId)}/${encodeURIComponent(versionId)}`,
      { headers: authHeader(tokenOrStored()) },
    );
    return mapProtocolPayload(data);
  } catch (error) {
    normalizeApiError(error);
  }
}

export { pointCountLabel };

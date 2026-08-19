import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

const BASE = "/admin/monthly-champions";
const PAGE_SIZE = 20;

function tokenOrStored(token) {
  return token || getAccountToken();
}

function formatMonthLabel(monthYear) {
  const raw = String(monthYear || "").trim();
  if (!/^\d{4}-\d{2}$/.test(raw)) return raw || "—";
  const [year, month] = raw.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function mapMonthlyChampion(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const score = Number(row.averageScore);
  const days = Number(row.daysSubmitted);
  const rank = Number(row.rank);
  return {
    id,
    userId: row.userId || "",
    monthYear: String(row.monthYear || "").trim(),
    monthLabel: formatMonthLabel(row.monthYear),
    rank: Number.isFinite(rank) ? rank : null,
    averageScore: Number.isFinite(score) ? score : null,
    daysSubmitted: Number.isFinite(days) ? days : null,
    message: String(row.message || "").trim(),
    name: String(row.user?.name || "").trim() || "Unknown",
    profileImage: row.user?.profileImage || "",
    commentCount: Number(row.commentCount) || 0,
    live: row.status !== "inactive",
    status: row.status === "inactive" ? "inactive" : "active",
    notifiedAt: row.notifiedAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function recentChampionMonthOptions(count = 12) {
  const options = [{ value: "", label: "All months" }];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    options.push({
      value,
      label: date.toLocaleString("en-US", { month: "long", year: "numeric" }),
    });
  }
  return options;
}

export function previousMonthYear() {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function adminListMonthlyChampions(
  token,
  { page = 1, limit = PAGE_SIZE, status, monthYear } = {},
) {
  const params = { page, limit };
  if (status) params.status = status;
  if (String(monthYear || "").trim()) params.monthYear = String(monthYear).trim();
  try {
    const { data } = await api.get(BASE, {
      params,
      headers: authHeader(tokenOrStored(token)),
    });
    const items = (Array.isArray(data.monthlyChampionPosts) ? data.monthlyChampionPosts : [])
      .map(mapMonthlyChampion)
      .filter(Boolean);
    return {
      items,
      pagination: data.pagination || { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateMonthlyChampion(token, id, fields = {}) {
  const payload = {};
  if (fields.message !== undefined) payload.message = String(fields.message || "").trim();
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
  try {
    const { data } = await api.patch(`${BASE}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapMonthlyChampion(data.monthlyChampionPost);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminRunMonthlyChampionJob(token, { monthYear } = {}) {
  const body = {};
  if (String(monthYear || "").trim()) body.monthYear = String(monthYear).trim();
  try {
    const { data } = await api.post(`${BASE}/jobs/run`, body, {
      headers: authHeader(tokenOrStored(token)),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export { PAGE_SIZE as MONTHLY_CHAMPION_PAGE_SIZE };

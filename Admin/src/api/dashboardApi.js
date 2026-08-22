import api, { normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function authHeader() {
  const token = getAccountToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchDashboardStatistics() {
  try {
    const { data } = await api.get("/account/dashboard/statistics", {
      headers: authHeader(),
    });
    return data?.statistics ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

function monthKeyFromIso(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : "";
}

function paymentDateLabel(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
  }).format(date);
}

function monthQueryBounds(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);
  const from = new Date(Date.UTC(year, month - 1, 1));
  from.setUTCDate(from.getUTCDate() - 1);
  const to = new Date(Date.UTC(year, month, 1));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function programTypeFromTransaction(tx) {
  const type = String(tx?.productType || "").toLowerCase();
  const catalog = String(
    tx?.userSnapshot?.catalogItemName ||
      tx?.userSnapshot?.programTitle ||
      tx?.userSnapshot?.healthConcernTitle ||
      "",
  ).trim();
  const concern = String(tx?.healthConcernSnapshot?.title || "").trim();
  const name = catalog || concern;
  if (type === "program") return name || "Wellness program";
  if (type === "consultancy") return "Consultation";
  if (type === "subscription" || type === "energy_exchange") {
    if (!name) return type === "energy_exchange" ? "Energy Exchange" : "App user";
    if (/^app user/i.test(name)) return name;
    return `App user · ${name}`;
  }
  return name || type.replace(/_/g, " ") || "—";
}

function mapTransactionToPayment(tx) {
  const paidAt = tx?.paidAt || tx?.createdAt;
  return {
    id: tx?.id || tx?._id || `${tx?.userId || "tx"}-${paidAt}`,
    userId: tx?.userId || tx?.userSnapshot?.id || null,
    userName: String(tx?.userSnapshot?.name || "").trim() || "Client",
    coachName:
      String(tx?.assigneeSnapshot?.name || tx?.parentCoach?.name || "").trim() || "—",
    programType: programTypeFromTransaction(tx),
    healthConcernId: tx?.healthConcernId || tx?.healthConcernSnapshot?.id || null,
    productType: String(tx?.productType || "").toLowerCase() || null,
    dateLabel: paymentDateLabel(paidAt),
    paidAt,
    amount: Number(tx?.totalAmount) || 0,
  };
}

async function fetchTransactionList(path, params) {
  try {
    const { data } = await api.get(path, {
      headers: authHeader(),
      params,
    });
    return Array.isArray(data?.transactions) ? data.transactions : [];
  } catch {
    return [];
  }
}

async function fetchPaymentsFromTransactionLists(month) {
  const { from, to } = monthQueryBounds(month);
  const params = { paymentStatus: "paid", from, to, limit: 200, page: 1 };
  const [consultancy, programs, energy] = await Promise.all([
    fetchTransactionList("/account/consultancy/transactions", params),
    fetchTransactionList("/admin/programs/transactions", params),
    fetchTransactionList("/admin/energy-exchange/transactions", params),
  ]);
  const merged = new Map();
  for (const tx of [...consultancy, ...programs, ...energy]) {
    const row = mapTransactionToPayment(tx);
    if (monthKeyFromIso(row.paidAt) !== month) continue;
    if (row.id) merged.set(String(row.id), row);
  }
  return [...merged.values()].sort((a, b) => String(b.paidAt || "").localeCompare(String(a.paidAt || "")));
}




export async function fetchDashboardMediaBlob(url) {
  try {
    const { data, headers } = await api.get("/account/dashboard/media", {
      headers: authHeader(),
      params: { url },
      responseType: "blob",
    });
    const type = String(headers?.["content-type"] || data?.type || "");
    if (!data || type.includes("json") || type.includes("text/html")) {
      throw new Error("Could not load media");
    }
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchDashboardPayments({ month, type = "consultancy", page = 1, limit = 25 } = {}) {
  let dedicated = null;
  try {
    const { data } = await api.get("/account/dashboard/payments", {
      headers: authHeader(),
      params: { month, type, page, limit },
    });
    return {
      payments: Array.isArray(data?.payments) ? data.payments : [],
      pagination: data?.pagination || { page, limit, total: 0, pages: 1, hasMore: false },
      summary: data?.summary || { count: 0, totalAmount: 0 },
      type: data?.type || type,
      month: data?.month || month,
    };
  } catch (error) {
    const status = error?.response?.status;
    if (status === 401 || status === 403) normalizeApiError(error);
    throw error;
  }
}

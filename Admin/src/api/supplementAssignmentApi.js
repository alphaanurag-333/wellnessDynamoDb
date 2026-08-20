import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import { formatPack } from "../data/nutritionBankData.js";
import { mapNutritionBankItem } from "./nutritionBankApi.js";

function tokenOrStored(token) {
  return token || getAccountToken();
}

function catalogBase() {
  return "/account/supplements";
}

function recBase(userId) {
  return `/account/heal-users/${encodeURIComponent(userId)}/supplement-recommendations`;
}

function dosageBase(userId) {
  return `/account/heal-users/${encodeURIComponent(userId)}/supplement-dosages`;
}

export function mapSupplementPoolItem(row) {
  const item = mapNutritionBankItem(row);
  if (!item) return null;
  return {
    ...item,
    pack: item.pack || formatPack(item.packSize, item.unit),
  };
}

export function mapRecommendationItem(row) {
  if (!row) return null;
  const id = String(row.supplementId || row.id || "").trim();
  if (!id) return null;
  const packSize = Number(row.packSize) || 0;
  const unit = String(row.unit || "").trim();
  return {
    id,
    supplementId: id,
    name: String(row.name || "").trim(),
    packSize,
    unit,
    pack: formatPack(packSize, unit),
    price: Number(row.price) || 0,
    qty: Math.max(1, Math.floor(Number(row.qty) || 1)),
  };
}

export function mapFulfilmentOrder(row) {
  if (!row) return null;
  const id = String(row.id || "").trim();
  if (!id) return null;
  const items = (Array.isArray(row.items) ? row.items : []).map(mapRecommendationItem).filter(Boolean);
  return {
    id,
    items,
    billingTotal: Number(row.billingTotal) || items.reduce((sum, item) => sum + item.price * item.qty, 0),
    placedOn: String(row.placedOn || "").trim(),
    vendor: String(row.vendor || "").trim(),
    tracking: String(row.tracking || "").trim(),
    expectedDelivery: String(row.expectedDelivery || "").trim(),
    billName: String(row.billFileName || "").trim(),
    billPdfUrl: String(row.billPdfUrl || "").trim(),
    billUploadedAt: row.billUploadedAt || null,
    status: String(row.status || "logged").trim() || "logged",
    saved: true,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapRecommendation(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const items = (Array.isArray(row.items) ? row.items : []).map(mapRecommendationItem).filter(Boolean);
  const deliveryOption = String(row.deliveryOption || "").toLowerCase() === "self_billing"
    ? "self_billing"
    : "coach_delivery";
  const fulfilmentOrders = (Array.isArray(row.fulfilmentOrders) ? row.fulfilmentOrders : [])
    .map(mapFulfilmentOrder)
    .filter(Boolean);
  return {
    id: String(id),
    userId: String(row.userId || ""),
    items,
    billingTotal: Number(row.billingTotal) || items.reduce((sum, item) => sum + item.price * item.qty, 0),
    deliveryOption,
    deliveryRequestedAt: row.deliveryRequestedAt || null,
    billPdfUrl: row.billPdfUrl || "",
    billUploadedAt: row.billUploadedAt || null,
    fulfilmentOrders,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapDosagePeriod(row, todayCompletion = {}) {
  if (!row) return null;
  const period = String(row.period || "").toLowerCase();
  if (!["morning", "afternoon", "evening"].includes(period)) return null;
  return {
    period,
    quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
    mealRelation: String(row.mealRelation || "after").toLowerCase() === "before" ? "before" : "after",
    completed: Boolean(row.completed) || todayCompletion[period] === true,
  };
}

export function mapDosage(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const todayCompletion = row.todayCompletion && typeof row.todayCompletion === "object"
    ? row.todayCompletion
    : {};
  return {
    id: String(id),
    userId: String(row.userId || ""),
    supplementId: String(row.supplementId || ""),
    name: String(row.name || "").trim(),
    unit: String(row.unit || "").trim(),
    packSize: Number(row.packSize) || 0,
    periods: (Array.isArray(row.periods) ? row.periods : []).map((period) => mapDosagePeriod(period, todayCompletion)).filter(Boolean),
    totalPerDay: Number(row.totalPerDay) || 0,
    durationDays: Number(row.durationDays) || 0,
    startDate: String(row.startDate || "").trim(),
    endDate: String(row.endDate || "").trim(),
    status: String(row.status || "active").toLowerCase() === "stopped" ? "stopped" : "active",
    progressPercent: Math.max(0, Math.min(100, Math.round(Number(row.progressPercent) || 0))),
    todayCompletion,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listActiveSupplementPool({ limit = 200 } = {}) {
  const q = new URLSearchParams();
  q.set("page", "1");
  q.set("limit", String(limit));
  q.set("status", "active");
  try {
    const { data } = await api.get(`${catalogBase()}?${q}`, {
      headers: authHeader(tokenOrStored()),
    });
    const items = (Array.isArray(data.supplements) ? data.supplements : [])
      .map(mapSupplementPoolItem)
      .filter(Boolean);
    return { items };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function listUserSupplementRecommendations(userId) {
  try {
    const { data } = await api.get(recBase(userId), {
      headers: authHeader(tokenOrStored()),
    });
    const recommendations = (Array.isArray(data.recommendations) ? data.recommendations : [])
      .map(mapRecommendation)
      .filter(Boolean);
    return {
      recommendations,
      recommended: mapRecommendation(data.recommended) || recommendations[0] || null,
      history: (Array.isArray(data.history) ? data.history : recommendations.slice(1))
        .map(mapRecommendation)
        .filter(Boolean),
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function createUserSupplementRecommendation(userId, { items, deliveryOption } = {}) {
  try {
    const { data } = await api.post(
      recBase(userId),
      {
        items: (Array.isArray(items) ? items : []).map((item) => ({
          supplementId: item.supplementId || item.id,
          qty: item.qty,
        })),
        deliveryOption: deliveryOption === "self" || deliveryOption === "self_billing"
          ? "self_billing"
          : "coach_delivery",
      },
      { headers: authHeader(tokenOrStored()) },
    );
    return mapRecommendation(data.recommendation);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deleteUserSupplementRecommendation(userId, recommendationId) {
  try {
    await api.delete(`${recBase(userId)}/${encodeURIComponent(recommendationId)}`, {
      headers: authHeader(tokenOrStored()),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function upsertUserSupplementFulfilmentOrder(userId, recommendationId, order) {
  try {
    const orderId = String(order?.id || "").trim();
    const payload = {
      items: (Array.isArray(order?.items) ? order.items : []).map((item) => ({
        supplementId: item.supplementId || item.id,
        qty: item.qty,
      })),
      placedOn: order?.placedOn,
      vendor: order?.vendor,
      tracking: order?.tracking,
      expectedDelivery: order?.expectedDelivery,
      status: order?.status || "logged",
      billFileName: order?.billName || order?.billFileName || "",
    };
    const path = orderId
      ? `${recBase(userId)}/${encodeURIComponent(recommendationId)}/fulfilment-orders/${encodeURIComponent(orderId)}`
      : `${recBase(userId)}/${encodeURIComponent(recommendationId)}/fulfilment-orders`;
    const { data } = orderId
      ? await api.put(path, payload, { headers: authHeader(tokenOrStored()) })
      : await api.post(path, payload, { headers: authHeader(tokenOrStored()) });
    return {
      order: mapFulfilmentOrder(data.order),
      recommendation: mapRecommendation(data.recommendation),
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function uploadUserSupplementFulfilmentOrderBill(userId, recommendationId, orderId, file) {
  try {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post(
      `${recBase(userId)}/${encodeURIComponent(recommendationId)}/fulfilment-orders/${encodeURIComponent(orderId)}/bill`,
      form,
      { headers: authHeader(tokenOrStored()) },
    );
    return {
      order: mapFulfilmentOrder(data.order),
      recommendation: mapRecommendation(data.recommendation),
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deleteUserSupplementFulfilmentOrder(userId, recommendationId, orderId) {
  try {
    const { data } = await api.delete(
      `${recBase(userId)}/${encodeURIComponent(recommendationId)}/fulfilment-orders/${encodeURIComponent(orderId)}`,
      { headers: authHeader(tokenOrStored()) },
    );
    return mapRecommendation(data.recommendation);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function listUserSupplementDosages(userId) {
  try {
    const { data } = await api.get(dosageBase(userId), {
      headers: authHeader(tokenOrStored()),
    });
    const dosages = (Array.isArray(data.dosages) ? data.dosages : []).map(mapDosage).filter(Boolean);
    return { dosages };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function createUserSupplementDosage(userId, { supplementId, startDate, periods } = {}) {
  try {
    const { data } = await api.post(
      dosageBase(userId),
      { supplementId, startDate, periods },
      { headers: authHeader(tokenOrStored()) },
    );
    return mapDosage(data.dosage);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function stopUserSupplementDosage(userId, dosageId) {
  try {
    await api.delete(`${dosageBase(userId)}/${encodeURIComponent(dosageId)}`, {
      headers: authHeader(tokenOrStored()),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

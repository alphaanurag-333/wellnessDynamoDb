import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function base() {
  return "/admin/coupons";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

export function mapCoupon(row) {
  if (!row) return null;
  return {
    id: row.id || row._id,
    title: row.title || "",
    status: row.status === "inactive" ? "inactive" : "active",
    couponCode: row.couponCode || "",
    discountType: row.discountType || "percentage",
    value: Number(row.value) || 0,
    appliesTo: Array.isArray(row.appliesTo) ? row.appliesTo : ["challenge"],
    challengeIds: Array.isArray(row.challengeIds) ? row.challengeIds : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function adminListCoupons(token, { page = 1, limit = 100, status, search } = {}) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) q.set("status", status);
  if (search) q.set("search", search);
  try {
    const { data } = await api.get(`${base()}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    return {
      items: (data.coupons || []).map(mapCoupon).filter(Boolean),
      pagination: data.pagination,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateCoupon(token, fields) {
  try {
    const { data } = await api.post(base(), fields, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapCoupon(data.coupon);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateCoupon(token, id, fields) {
  try {
    const { data } = await api.patch(`${base()}/${id}`, fields, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapCoupon(data.coupon);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteCoupon(token, id) {
  try {
    await api.delete(`${base()}/${id}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

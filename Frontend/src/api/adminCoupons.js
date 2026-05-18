import api, { authHeader, normalizeApiError } from "../api.js";

function couponBase() {
  return "/admin/coupons";
}

export async function adminListCoupons(token, { page = 1, limit = 200, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${couponBase()}?${q}`, { headers: authHeader(token) });
    return {
      coupons: Array.isArray(data.coupons) ? data.coupons : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetCouponById(token, id) {
  try {
    const { data } = await api.get(`${couponBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.coupon;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateCoupon(token, fields) {
  try {
    const { data } = await api.post(
      couponBase(),
      {
        title: String(fields.title ?? "").trim(),
        status: String(fields.status || "active"),
        couponCode: String(fields.couponCode ?? "").trim(),
        discountType: String(fields.discountType || "percentage"),
        value: Number(fields.value),
      },
      { headers: authHeader(token) }
    );
    return data.coupon;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateCoupon(token, id, fields) {
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.status !== undefined) payload.status = String(fields.status);
  if (fields.couponCode !== undefined) payload.couponCode = String(fields.couponCode).trim();
  if (fields.discountType !== undefined) payload.discountType = String(fields.discountType);
  if (fields.value !== undefined) payload.value = Number(fields.value);

  try {
    const { data } = await api.patch(`${couponBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return data.coupon;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteCoupon(token, id) {
  try {
    await api.delete(`${couponBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

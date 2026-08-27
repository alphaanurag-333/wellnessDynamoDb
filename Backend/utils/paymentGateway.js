const crypto = require("crypto");

const CASHFREE_API_VERSION = "2023-08-01";
const CASHFREE_BASE_URLS = {
  uat: "https://sandbox.cashfree.com/pg",
  live: "https://api.cashfree.com/pg",
};

function toPaise(amountInRupees) {
  return Math.max(1, Math.round(Number(amountInRupees) * 100));
}

function cashfreeBaseUrl(mode) {
  return mode === "live" ? CASHFREE_BASE_URLS.live : CASHFREE_BASE_URLS.uat;
}

async function cashfreeRequest({ gateway, path, method = "GET", body }) {
  const response = await fetch(`${gateway.baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-client-id": gateway.appId,
      "x-client-secret": gateway.secretKey,
      "x-api-version": CASHFREE_API_VERSION,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(
      data?.message ||
        data?.error?.message ||
        (Array.isArray(data?.message) ? data.message.join(", ") : null) ||
        "Cashfree request failed"
    );
    err.name = "PaymentGatewayError";
    err.statusCode = response.status;
    err.details = data;
    throw err;
  }
  return data;
}

/**
 * Create a Cashfree order. Returns a normalized order shape used by payment services.
 */
async function createCashfreeOrder({
  gateway,
  amountInRupees,
  currency = "INR",
  receipt,
  customer = {},
  notes = {},
}) {
  if (!gateway) {
    const err = new Error("Payment gateway is not configured");
    err.name = "PaymentGatewayError";
    throw err;
  }

  const orderId = `wd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.slice(0, 50);
  const customerId = String(customer.id || customer.customer_id || "guest")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 50);
  const customerPhone = String(customer.phone || customer.customer_phone || "9999999999").replace(
    /\D/g,
    ""
  ).slice(-10) || "9999999999";

  const tagEntries = Object.entries({
    receipt: receipt || undefined,
    ...notes,
  })
    .filter(([, value]) => value != null && String(value).trim() !== "")
    .map(([key, value]) => [String(key).slice(0, 50), String(value).slice(0, 100)])
    .slice(0, 10);

  const data = await cashfreeRequest({
    gateway,
    path: "/orders",
    method: "POST",
    body: {
      order_id: orderId,
      order_amount: Number(Number(amountInRupees).toFixed(2)),
      order_currency: currency,
      order_note: notes.productType || notes.transactionId || receipt || undefined,
      customer_details: {
        customer_id: customerId || "guest",
        customer_phone: customerPhone,
        customer_email: customer.email || customer.customer_email || undefined,
        customer_name: customer.name || customer.customer_name || undefined,
      },
      order_tags: Object.fromEntries(tagEntries),
    },
  });

  return {
    id: data.order_id || orderId,
    payment_session_id: data.payment_session_id || null,
    amount: toPaise(data.order_amount ?? amountInRupees),
    currency: data.order_currency || currency,
    status: data.order_status || "ACTIVE",
    provider: "cashfree",
    raw: data,
  };
}

function isCashfreeOrderPaid(order) {
  const status = String(order?.order_status || order?.status || "").toUpperCase();
  return status === "PAID" || status === "SUCCESS";
}

async function getCashfreeOrder({ gateway, orderId }) {
  return cashfreeRequest({
    gateway,
    path: `/orders/${encodeURIComponent(orderId)}`,
    method: "GET",
  });
}

async function getCashfreeOrderPayments({ gateway, orderId }) {
  return cashfreeRequest({
    gateway,
    path: `/orders/${encodeURIComponent(orderId)}/payments`,
    method: "GET",
  });
}

/**
 * Verifies payment by fetching Cashfree order status (and payments as fallback).
 * Returns { verified, paymentId, order }.
 */
async function verifyCashfreePayment({ gateway, orderId }) {
  if (!gateway || !orderId) {
    return { verified: false, paymentId: null, order: null };
  }

  const order = await getCashfreeOrder({ gateway, orderId });
  if (isCashfreeOrderPaid(order)) {
    let paymentId = null;
    try {
      const payments = await getCashfreeOrderPayments({ gateway, orderId });
      const list = Array.isArray(payments) ? payments : payments?.payments || [];
      const success = list.find((p) =>
        ["SUCCESS", "PAID"].includes(String(p?.payment_status || "").toUpperCase())
      );
      paymentId = success?.cf_payment_id ? String(success.cf_payment_id) : null;
    } catch {
      // Order is paid; payment id is optional enrichment.
    }
    return { verified: true, paymentId, order };
  }

  return { verified: false, paymentId: null, order };
}

function verifyCashfreeWebhookSignature({ rawBody, signature, timestamp, webhookSecret }) {
  if (!webhookSecret || !signature || !timestamp) return false;
  const signedPayload = `${timestamp}${rawBody}`;
  const expected = crypto.createHmac("sha256", webhookSecret).update(signedPayload).digest("base64");
  return expected === signature;
}

function buildClientPaymentPayload({ gateway, order, extras = {} }) {
  return {
    provider: "cashfree",
    orderId: order?.id || null,
    paymentSessionId: order?.payment_session_id || null,
    amount: order?.amount ?? null,
    currency: order?.currency || "INR",
    mode: gateway?.mode || null,
    ...extras,
  };
}

function resolveVerifyPaymentFields(body = {}) {
  return {
    orderId:
      body.orderId ||
      body.order_id ||
      body.cashfree_order_id ||
      body.razorpay_order_id ||
      null,
    paymentId:
      body.paymentId ||
      body.payment_id ||
      body.cashfree_payment_id ||
      body.razorpay_payment_id ||
      null,
  };
}

module.exports = {
  toPaise,
  cashfreeBaseUrl,
  createCashfreeOrder,
  getCashfreeOrder,
  verifyCashfreePayment,
  verifyCashfreeWebhookSignature,
  buildClientPaymentPayload,
  resolveVerifyPaymentFields,
  CASHFREE_API_VERSION,
};

const crypto = require("crypto");
const config = require("../config");

function toPaise(amountInRupees) {
  return Math.max(1, Math.round(Number(amountInRupees) * 100));
}

async function razorpayRequest({ keyId, keySecret, path, method = "GET", body }) {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.error?.description || data?.message || "Razorpay request failed");
    err.name = "PaymentGatewayError";
    err.statusCode = response.status;
    err.details = data;
    throw err;
  }
  return data;
}

async function createRazorpayOrder({ gateway, amountInRupees, currency = "INR", receipt, notes = {} }) {
  const order = await razorpayRequest({
    keyId: gateway.keyId,
    keySecret: gateway.keySecret,
    path: "/orders",
    method: "POST",
    body: {
      amount: toPaise(amountInRupees),
      currency,
      receipt,
      notes,
    },
  });
  return order;
}

function verifyRazorpayPaymentSignature({ orderId, paymentId, signature, keySecret }) {
  const payload = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", keySecret).update(payload).digest("hex");
  return expected === signature;
}

function verifyRazorpayWebhookSignature({ rawBody, signature, webhookSecret }) {
  if (!webhookSecret || !signature) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return expected === signature;
}

function createMockOrder({ amountInRupees, receipt }) {
  return {
    id: `order_mock_${Date.now()}`,
    amount: toPaise(amountInRupees),
    currency: "INR",
    receipt,
    status: "created",
    provider: "mock",
  };
}

function verifyMockPayment({ orderId }) {
  return String(orderId || "").startsWith("order_mock_");
}

function shouldUseMockPayments(gateway) {
  if (!gateway) return true;
  if (config.mockPayments === true) return true;
  return config.nodeEnv !== "production" && process.env.MOCK_PAYMENTS === "true";
}

module.exports = {
  toPaise,
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  createMockOrder,
  verifyMockPayment,
  shouldUseMockPayments,
};

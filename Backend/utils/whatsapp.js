const config = require("../config");
const { resolveWhatsappNumber } = require("../services/meetingAssigneeService");

function formatE164(phoneCountryCode, phone) {
  const cc = String(phoneCountryCode || "").replace(/\s/g, "");
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (cc.startsWith("+")) return `${cc}${digits}`;
  return `+${cc.replace(/^\+/, "")}${digits}`;
}

/** BhashSMS expects local digits (e.g. 10-digit India without leading 91). */
function toBhashPhone(phoneCountryCode, phone) {
  const e164 = formatE164(phoneCountryCode, phone);
  if (!e164) return null;
  let digits = e164.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits || null;
}

function isBhashSuccessBody(body) {
  const text = String(body || "").trim();
  if (!text) return false;
  const lower = text.toLowerCase();
  if (
    lower.includes("error") ||
    lower.includes("fail") ||
    lower.includes("invalid") ||
    lower.includes("not activated") ||
    lower.includes("not supported") ||
    lower.includes("only utility")
  ) {
    return false;
  }
  // Successful sends typically return codes like "S.61066"
  return /^S\./i.test(text) || /^[A-Z]\.\d+/i.test(text);
}

function buildBhashUrl(params) {
  const base = String(config.bhashsmsBaseUrl || "").trim();
  // Match Postman: encode values, but keep document URL readable (encode only & # space).
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    const raw = String(value);
    let encoded;
    if (key === "url") {
      encoded = raw.replace(/%/g, "%25").replace(/&/g, "%26").replace(/#/g, "%23").replace(/\s/g, "%20");
    } else if (key === "fname") {
      encoded = raw.replace(/\s/g, "%20");
    } else {
      encoded = encodeURIComponent(raw);
    }
    parts.push(`${encodeURIComponent(key)}=${encoded}`);
  }
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}${parts.join("&")}`;
}

function resolveTemplateName(explicit) {
  return String(explicit || config.bhashsmsTemplate || "invoice_1").trim() || "invoice_1";
}

function resolveTemplateParams({ params, message }) {
  if (params !== undefined && params !== null && String(params).trim() !== "") {
    return String(params);
  }
  if (config.bhashsmsUseMessageAsParams) {
    const body = String(message || "").trim();
    if (body) return body;
  }
  const configured = String(config.bhashsmsTemplateParams ?? "1").trim();
  return configured === "" ? "1" : configured;
}

async function callBhashSms(params) {
  const user = String(config.bhashsmsUser || "").trim();
  const pass = String(config.bhashsmsPass || "").trim();
  const sender = String(config.bhashsmsSender || "BUZWAP").trim() || "BUZWAP";

  if (!user || !pass) {
    return { ok: false, reason: "not_configured", data: null };
  }

  const requestUrl = buildBhashUrl({
    user,
    pass,
    sender,
    priority: "wa",
    stype: "normal",
    ...params,
  });

  // Log outbound shape (never log password) so we can confirm template vs free-form.
  try {
    const debugUrl = new URL(requestUrl);
    debugUrl.searchParams.set("pass", "***");
    console.info(
      "[WhatsApp/BhashSMS] request",
      JSON.stringify({
        text: debugUrl.searchParams.get("text"),
        Params: debugUrl.searchParams.get("Params"),
        htype: debugUrl.searchParams.get("htype"),
        fname: debugUrl.searchParams.get("fname"),
        phone: debugUrl.searchParams.get("phone"),
        hasUrl: Boolean(debugUrl.searchParams.get("url")),
      })
    );
  } catch {
    console.info("[WhatsApp/BhashSMS] request (unparsed)");
  }

  try {
    const response = await fetch(requestUrl, { method: "GET" });
    const data = await response.text().catch(() => "");
    if (!response.ok) {
      console.error("[WhatsApp/BhashSMS] HTTP error", response.status, data);
      return { ok: false, reason: `http_${response.status}`, data };
    }
    if (!isBhashSuccessBody(data)) {
      console.error("[WhatsApp/BhashSMS] send failed", data);
      return { ok: false, reason: String(data || "send_failed").slice(0, 300), data };
    }
    return { ok: true, reason: null, data: String(data || "").trim() };
  } catch (err) {
    console.error("[WhatsApp/BhashSMS] send error", err.message);
    return { ok: false, reason: err.message, data: null };
  }
}

/**
 * Text / reminder WhatsApp.
 * Does NOT attach invoice PDF unless attachDocument/documentUrl is set.
 *
 * Reminder path (default):
 * - If BHASHSMS_REMINDER_TEMPLATE is set → template name in `text`, message in `Params`
 * - Else if BHASHSMS_ALLOW_SESSION_TEXT=true → free-form message in `text`
 * - Else → clear failure (do not fall back to invoice_1 payment receipt)
 */
async function sendWhatsAppText({
  toPhoneCountryCode,
  toPhone,
  message,
  templateName,
  params,
  documentUrl,
  fileName,
  attachDocument = false,
  purpose = "reminder",
}) {
  const phone = toBhashPhone(toPhoneCountryCode, toPhone);
  const to = formatE164(toPhoneCountryCode, toPhone);
  if (!phone) {
    return { sent: false, reason: "missing_phone", to };
  }

  const body = String(message || "").trim();
  const user = String(config.bhashsmsUser || "").trim();
  const pass = String(config.bhashsmsPass || "").trim();
  if (!user || !pass) {
    if (config.nodeEnv !== "production") {
      console.info(`[WhatsApp/BhashSMS] To ${phone}: ${body || "(empty)"}`);
      return { sent: true, provider: "mock", to: phone };
    }
    return { sent: false, reason: "not_configured", to: phone };
  }

  const explicitDocUrl = String(documentUrl || "").trim();
  const configuredDocUrl = String(config.bhashsmsDocumentUrl || "").trim();
  const docUrl =
    explicitDocUrl ||
    (attachDocument || purpose === "document"
      ? configuredDocUrl || "https://bhashsms.com/pushwa/iframe/files/trai.pdf"
      : "");

  // Payment / document path only when explicitly requested
  if (docUrl) {
    const template = resolveTemplateName(templateName);
    const templateParams = resolveTemplateParams({ params, message });
    const fname =
      String(fileName || config.bhashsmsDocumentFname || "PDF File").trim() || "PDF File";
    return sendWhatsAppDocument({
      toPhoneCountryCode,
      toPhone,
      templateName: template,
      params: templateParams,
      documentUrl: docUrl,
      fileName: fname,
    });
  }

  if (!body) {
    return { sent: false, reason: "empty_message", to: phone };
  }

  // Reminder / notice: never use invoice_1 + PDF
  const reminderTemplate = String(
    templateName || config.bhashsmsReminderTemplate || ""
  ).trim();

  if (reminderTemplate) {
    // Bhash Params: comma-separated template variables ({{1}}, {{2}}, ...)
    let paramValue;
    if (params != null && String(params).trim() !== "") {
      paramValue = String(params).trim();
    } else {
      paramValue = body.replace(/,/g, " ").trim();
    }
    const result = await callBhashSms({
      phone,
      text: reminderTemplate,
      Params: paramValue,
    });
    if (!result.ok) {
      return { sent: false, reason: result.reason || "send_failed", to: phone };
    }
    return {
      sent: true,
      provider: "bhashsms",
      to: phone,
      messageId: result.data || null,
    };
  }

  if (config.bhashsmsAllowSessionText || !reminderTemplate) {
    // Free-form session message (needs SplitCredits / open customer-care window on Bhash)
    const result = await callBhashSms({ phone, text: body });
    if (!result.ok) {
      const bhashReason = result.reason || "send_failed";
      if (/utility|authentication|template|splitcredits/i.test(bhashReason)) {
        return {
          sent: false,
          reason:
            `${bhashReason}. Free-form WhatsApp text is blocked on this Bhash account. ` +
            `Ask Bhash to approve a utility reminder template, then set BHASHSMS_REMINDER_TEMPLATE=<template_name> in Backend .env ` +
            `(do not use invoice_1 — that sends the payment receipt PDF).`,
          to: phone,
        };
      }
      return { sent: false, reason: bhashReason, to: phone };
    }
    return {
      sent: true,
      provider: "bhashsms",
      to: phone,
      messageId: result.data || null,
    };
  }

  return {
    sent: false,
    reason:
      "Reminder WhatsApp needs an approved utility template. Set BHASHSMS_REMINDER_TEMPLATE in Backend .env (do not use invoice_1 — that is the payment receipt). Or set BHASHSMS_ALLOW_SESSION_TEXT=true if SplitCredits/session messages are enabled on Bhash.",
    to: phone,
  };
}

/**
 * Document/template send matching BhashSMS Postman shape:
 * text=templateName, Params=..., htype=document, fname=..., url=...
 */
async function sendWhatsAppDocument({
  toPhoneCountryCode,
  toPhone,
  templateName,
  params = "",
  documentUrl,
  fileName = "PDF File",
}) {
  const phone = toBhashPhone(toPhoneCountryCode, toPhone);
  if (!phone) {
    return { sent: false, reason: "missing_phone" };
  }

  const text = resolveTemplateName(templateName);
  const url = String(documentUrl || "").trim();
  if (!url) {
    return { sent: false, reason: "missing_document_url", to: phone };
  }

  const user = String(config.bhashsmsUser || "").trim();
  const pass = String(config.bhashsmsPass || "").trim();
  if (!user || !pass) {
    if (config.nodeEnv !== "production") {
      console.info(`[WhatsApp/BhashSMS] Document to ${phone}: ${text} ${url}`);
      return { sent: true, provider: "mock", to: phone };
    }
    return { sent: false, reason: "not_configured", to: phone };
  }

  const result = await callBhashSms({
    phone,
    text,
    Params: params === undefined || params === null ? "1" : String(params),
    htype: "document",
    fname: String(fileName || "PDF File").trim() || "PDF File",
    url,
  });
  if (!result.ok) {
    return { sent: false, reason: result.reason || "send_failed", to: phone };
  }
  return {
    sent: true,
    provider: "bhashsms",
    to: phone,
    messageId: result.data || null,
  };
}

async function sendConsultancyWhatsAppNotifications({
  user,
  assignee,
  parentCoach,
  referenceNumber,
  zoomJoinUrl,
  totalAmount,
}) {
  const results = { user: null, assignee: null, parentCoach: null };

  const userWa = resolveWhatsappNumber(user);
  if (userWa) {
    results.user = await sendWhatsAppText({
      toPhoneCountryCode: userWa.phoneCountryCode,
      toPhone: userWa.phone,
      message: `Thank you for your payment of Rs. ${totalAmount}. Reference: ${referenceNumber}. Your Zoom meeting link: ${zoomJoinUrl}. Please reply with your preferred time slot to book the appointment.`,
      purpose: "document",
      attachDocument: true,
      templateName: config.bhashsmsTemplate || "invoice_1",
      params: config.bhashsmsTemplateParams || "1",
    });
  }

  if (assignee && assignee.type !== "admin") {
    const assigneeWa = resolveWhatsappNumber(assignee);
    if (assigneeWa) {
      results.assignee = await sendWhatsAppText({
        toPhoneCountryCode: assigneeWa.phoneCountryCode,
        toPhone: assigneeWa.phone,
        message: `New consultancy booking assigned to you. Client: ${user?.name || "User"}. Reference: ${referenceNumber}. Zoom link: ${zoomJoinUrl}`,
        purpose: "reminder",
      });
    }
  }

  if (
    parentCoach &&
    assignee?.type === "assistant_wellness_coach" &&
    parentCoach.id !== assignee.id
  ) {
    const parentWa = resolveWhatsappNumber(parentCoach);
    if (parentWa) {
      results.parentCoach = await sendWhatsAppText({
        toPhoneCountryCode: parentWa.phoneCountryCode,
        toPhone: parentWa.phone,
        message: `Consultancy booked with your assistant (${assignee.name || "AWC"}). Client: ${user?.name || "User"}. Reference: ${referenceNumber}. Zoom: ${zoomJoinUrl}`,
        purpose: "reminder",
      });
    }
  }

  return results;
}

async function sendCoachAssignmentNotifications({ user, assignee, assigneeType }) {
  const results = { user: null, assignee: null };
  const coachLabel =
    assigneeType === "assistant_wellness_coach" ? "assistant wellness coach" : "wellness coach";

  const userWa = resolveWhatsappNumber(user);
  if (userWa) {
    results.user = await sendWhatsAppText({
      toPhoneCountryCode: userWa.phoneCountryCode,
      toPhone: userWa.phone,
      message: `You have been assigned to ${assignee?.name || `your ${coachLabel}`}. They will reach out to schedule your consultancy session.`,
    });
  }

  const assigneeWa = resolveWhatsappNumber(assignee);
  if (assigneeWa) {
    results.assignee = await sendWhatsAppText({
      toPhoneCountryCode: assigneeWa.phoneCountryCode,
      toPhone: assigneeWa.phone,
      message: `A new client has been assigned to you: ${user?.name || "User"} (${user?.email || user?.phone || "contact in portal"}).`,
    });
  }

  return results;
}

async function sendChallengePaymentWhatsApp({
  user,
  challenge,
  referenceNumber,
  totalAmount,
  template,
}) {
  const results = { user: null };
  const userWa = resolveWhatsappNumber(user);
  if (!userWa) {
    return { user: { sent: false, reason: "missing_phone" } };
  }

  const title = challenge?.title || "Challenge";
  const amount = Number(totalAmount) || 0;
  const ref = referenceNumber || "";
  const name = user?.name || "there";

  let message = String(template || "").trim();
  if (message) {
    message = message
      .replace(/\{name\}/gi, name)
      .replace(/\{title\}/gi, title)
      .replace(/\{amount\}/gi, String(amount))
      .replace(/\{ref\}/gi, ref)
      .replace(/\{reference\}/gi, ref);
  } else {
    message =
      `Thank you for joining ${title}. Payment of Rs. ${amount} received (Ref: ${ref}). ` +
      `A wellness coach will call you shortly to guide you through the next steps.`;
  }

  results.user = await sendWhatsAppText({
    toPhoneCountryCode: userWa.phoneCountryCode,
    toPhone: userWa.phone,
    message,
  });
  return results;
}

module.exports = {
  formatE164,
  toBhashPhone,
  sendWhatsAppText,
  sendWhatsAppDocument,
  sendConsultancyWhatsAppNotifications,
  sendCoachAssignmentNotifications,
  sendChallengePaymentWhatsApp,
};

const config = require("../config");
const { resolveWhatsappNumber } = require("../services/meetingAssigneeService");

const DEFAULT_SENDER = "BUZWAP";
const DEFAULT_INVOICE_TEMPLATE = "invoice_irw01";
const DEFAULT_OTP_TEMPLATE = "otp_auth_irw";
const DEFAULT_ONBOARDING_REMINDER_TEMPLATE = "gen_rem01";
const DEFAULT_DOCUMENT_NAME = "Payment-Receipt.pdf";

const NAMED_TEMPLATES = {
  invoice: { configKey: "bhashsmsInvoiceTemplate", defaultName: "invoice_irw01", kind: "document" },
  pwcUser: { configKey: "bhashsmsPwcUserTemplate", defaultName: "pwc_user_intim_01", kind: "text" },
  pwcCoach: { configKey: "bhashsmsPwcCoachTemplate", defaultName: "pwc_initimate_021", kind: "text" },
  programConfirm: { configKey: "bhashsmsProgramConfirmTemplate", defaultName: "ir_prg_confirm_01", kind: "text" },
  uobBa: { configKey: "bhashsmsUobBaTemplate", defaultName: "ir_uob_ba_01", kind: "text" },
  uobBr: { configKey: "bhashsmsUobBrTemplate", defaultName: "ir_uob_br_01", kind: "text" },
  uobCl: { configKey: "bhashsmsUobClTemplate", defaultName: "ir_uob_cl_01", kind: "text" },
  uobHap: { configKey: "bhashsmsUobHapTemplate", defaultName: "ir_uob_hap_01", kind: "text" },
  uobLaunch: { configKey: "bhashsmsUobLauTemplate", defaultName: "ir_uob_lau_01", kind: "text" },
  uobPiCoach: { configKey: "bhashsmsUobPiCoachTemplate", defaultName: "ir_uob_pi_011", kind: "text" },
  uobPiUser: { configKey: "bhashsmsUobPiUserTemplate", defaultName: "ir_uob_pi_012", kind: "text" },
  uobReportsBriefing: { configKey: "bhashsmsUobRbTemplate", defaultName: "ir_uob_rb_01", kind: "text" },
};

const SLOT_TEMPLATE_BY_STEP = {
  launch: "uobLaunch",
  reportsBriefing: "uobReportsBriefing",
  hap: "uobHap",
  programInitiation: "uobPiUser",
};

function formatE164(phoneCountryCode, phone) {
  const cc = String(phoneCountryCode || "").replace(/\s/g, "");
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (cc.startsWith("+")) return `${cc}${digits}`;
  return `+${cc.replace(/^\+/, "")}${digits}`;
}

function toBhashPhone(phoneCountryCode, phone) {
  const e164 = formatE164(phoneCountryCode, phone);
  if (!e164) return null;
  let digits = e164.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits || null;
}

function trim(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function firstName(value) {
  return String(value || "there").trim().split(/\s+/).filter(Boolean)[0] || "there";
}

/** Bhash `Params` are comma-separated template variables ({{1}}, {{2}}, ...). */
function bhashParams(...values) {
  return values.map((value) => String(value || "").replace(/,/g, " ").trim() || "-").join(",");
}

function bhashCredentials() {
  const user = trim(config.bhashsmsUser);
  const pass = trim(config.bhashsmsPass);
  const sender = trim(config.bhashsmsSender, DEFAULT_SENDER);
  if (!user || !pass) return null;
  return { user, pass, sender };
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
  return /^S\./i.test(text) || /^[A-Z]\.\d+/i.test(text);
}

function encodeBhashValue(key, value) {
  const raw = String(value);
  if (key === "url") {
    return raw.replace(/%/g, "%25").replace(/&/g, "%26").replace(/#/g, "%23").replace(/\s/g, "%20");
  }
  if (key === "fname") return raw.replace(/\s/g, "%20");
  return encodeURIComponent(raw);
}

function buildBhashUrl(params, baseUrl) {
  const base = trim(baseUrl || config.bhashsmsBaseUrl);
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeBhashValue(key, value)}`)
    .join("&");
  return `${base}${base.includes("?") ? "&" : "?"}${query}`;
}

function resolveTemplateName(explicit) {
  return trim(explicit || config.bhashsmsInvoiceTemplate || config.bhashsmsTemplate, DEFAULT_INVOICE_TEMPLATE);
}

function resolveNamedTemplate(templateKey) {
  const spec = NAMED_TEMPLATES[templateKey];
  if (!spec) return null;
  return {
    ...spec,
    name: trim(config[spec.configKey], spec.defaultName),
  };
}

function formatInrAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value || "0").replace(/,/g, "").trim() || "0";
  return String(Math.round(n));
}

function pwcBookedForLabel({ healthConcernTitle, paidAt } = {}) {
  const concern = trim(healthConcernTitle);
  if (concern) return concern;
  if (paidAt) {
    const formatted = new Date(paidAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
    if (formatted && formatted !== "Invalid Date") return formatted;
  }
  return "today";
}

function slotTemplateKeyForStep(stepKey) {
  return SLOT_TEMPLATE_BY_STEP[String(stepKey || "").trim()] || null;
}

function resolveTemplateParams({ params, message }) {
  if (params != null && String(params).trim() !== "") return String(params);
  if (config.bhashsmsUseMessageAsParams) {
    const body = trim(message);
    if (body) return body;
  }
  return trim(config.bhashsmsTemplateParams, "1");
}

function logBhashRequest(requestUrl, { baseUrl, stype }) {
  try {
    const debugUrl = new URL(requestUrl);
    debugUrl.searchParams.set("pass", "***");
    console.info(
      "[WhatsApp/BhashSMS] request",
      JSON.stringify({
        endpoint: baseUrl || config.bhashsmsBaseUrl,
        stype,
        text: debugUrl.searchParams.get("text"),
        Params: stype === "auth" ? "***" : debugUrl.searchParams.get("Params"),
        htype: debugUrl.searchParams.get("htype"),
        fname: debugUrl.searchParams.get("fname"),
        phone: debugUrl.searchParams.get("phone"),
        hasUrl: Boolean(debugUrl.searchParams.get("url")),
      })
    );
  } catch {
    console.info("[WhatsApp/BhashSMS] request (unparsed)");
  }
}

function toSendResult(phone, result) {
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

function mockIfDev(phone, logLine) {
  if (config.nodeEnv !== "production") {
    console.info(logLine);
    return { sent: true, provider: "mock", to: phone };
  }
  return { sent: false, reason: "not_configured", to: phone };
}

async function callBhashSms(params, options = {}) {
  const creds = bhashCredentials();
  const stype = trim(options.stype || params.stype, "normal");
  if (!creds) return { ok: false, reason: "not_configured", data: null };

  const requestUrl = buildBhashUrl(
    { ...creds, priority: "wa", ...params, stype },
    options.baseUrl
  );
  logBhashRequest(requestUrl, { baseUrl: options.baseUrl, stype });

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

async function sendWhatsAppOtp({ phoneCountryCode, phone, otp }) {
  const bhashPhone = toBhashPhone(phoneCountryCode, phone);
  const code = trim(otp);
  if (!bhashPhone) return { sent: false, reason: "missing_phone" };
  if (!code) return { sent: false, reason: "missing_otp" };
  if (!bhashCredentials()) return { sent: false, reason: "not_configured" };

  const result = await callBhashSms(
    {
      phone: bhashPhone,
      text: trim(config.bhashsmsOtpTemplate, DEFAULT_OTP_TEMPLATE),
      Params: code,
    },
    { baseUrl: config.bhashsmsAuthBaseUrl, stype: "auth" }
  );
  return toSendResult(bhashPhone, result);
}

async function sendNamedWhatsAppTemplate({
  templateKey,
  person,
  params = [],
  documentUrl,
  fileName,
}) {
  const spec = resolveNamedTemplate(templateKey);
  if (!spec) return { sent: false, reason: "unknown_template", templateKey };
  const wa = resolveWhatsappNumber(person);
  if (!wa?.phone) return { sent: false, reason: "missing_phone", templateKey };

  const paramList = Array.isArray(params) ? params : [params];
  const paramStr = bhashParams(...paramList);

  if (spec.kind === "document") {
    const url = trim(documentUrl);
    if (!url) {
      return { sent: false, reason: "missing_document_url", template: spec.name, templateKey };
    }
    const result = await sendWhatsAppDocument({
      toPhoneCountryCode: wa.phoneCountryCode,
      toPhone: wa.phone,
      templateName: spec.name,
      params: paramStr,
      documentUrl: url,
      fileName: trim(fileName, DEFAULT_DOCUMENT_NAME),
    });
    return { ...result, template: spec.name, templateKey };
  }

  const result = await sendWhatsAppText({
    toPhoneCountryCode: wa.phoneCountryCode,
    toPhone: wa.phone,
    message: spec.name,
    templateName: spec.name,
    params: paramStr,
    purpose: "named",
  });
  if (!result.sent) {
    console.error(
      `[WhatsApp/BhashSMS] named template failed key=${templateKey} name=${spec.name} reason=${result.reason || "send_failed"}`
    );
  }
  return { ...result, template: spec.name, templateKey };
}

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
  if (!phone) return { sent: false, reason: "missing_phone", to };

  const body = trim(message);
  if (!bhashCredentials()) {
    return mockIfDev(phone, `[WhatsApp/BhashSMS] To ${phone}: ${body || "(empty)"}`);
  }

  const docUrl = trim(documentUrl);
  if (docUrl) {
    return sendWhatsAppDocument({
      toPhoneCountryCode,
      toPhone,
      templateName: resolveTemplateName(templateName),
      params: resolveTemplateParams({ params, message }),
      documentUrl: docUrl,
      fileName: trim(fileName, DEFAULT_DOCUMENT_NAME),
    });
  }

  if (attachDocument || purpose === "document") {
    return { sent: false, reason: "missing_document_url", to: phone };
  }

  if (!body) return { sent: false, reason: "empty_message", to: phone };

  const reminderTemplate = trim(templateName || config.bhashsmsReminderTemplate);
  if (reminderTemplate) {
    const paramValue =
      params != null && String(params).trim() !== ""
        ? String(params).trim()
        : body.replace(/,/g, " ").trim();
    return toSendResult(
      phone,
      await callBhashSms({ phone, text: reminderTemplate, Params: paramValue })
    );
  }

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
  return toSendResult(phone, result);
}

async function sendOnboardingReminderWhatsApp({ user, stepLabel }) {
  const wa = resolveWhatsappNumber(user);
  if (!wa?.phone) return { sent: false, reason: "missing_phone" };

  const name = firstName(user?.name);
  const step = trim(stepLabel, "your next step");
  const template = trim(
    config.bhashsmsOnboardingReminderTemplate,
    DEFAULT_ONBOARDING_REMINDER_TEMPLATE
  );
  const preview =
    `Hi ${name}, Your next onboarding step is ${step}. ` +
    `Please complete it in the app when you get a moment. Thank you!`;

  return sendWhatsAppText({
    toPhoneCountryCode: wa.phoneCountryCode,
    toPhone: wa.phone,
    message: preview,
    templateName: template,
    params: bhashParams(name, step),
    purpose: "reminder",
  });
}

async function sendWhatsAppDocument({
  toPhoneCountryCode,
  toPhone,
  templateName,
  params = "",
  documentUrl,
  fileName = DEFAULT_DOCUMENT_NAME,
}) {
  const phone = toBhashPhone(toPhoneCountryCode, toPhone);
  if (!phone) return { sent: false, reason: "missing_phone" };

  const text = resolveTemplateName(templateName);
  const url = trim(documentUrl);
  if (!url) return { sent: false, reason: "missing_document_url", to: phone };

  if (!bhashCredentials()) {
    return mockIfDev(phone, `[WhatsApp/BhashSMS] Document to ${phone}: ${text} ${url}`);
  }

  return toSendResult(
    phone,
    await callBhashSms({
      phone,
      text,
      Params: params == null ? "1" : String(params),
      htype: "document",
      fname: trim(fileName, DEFAULT_DOCUMENT_NAME),
      url,
    })
  );
}

async function notifyPerson(person, message, extra = {}) {
  const wa = resolveWhatsappNumber(person);
  if (!wa) return null;
  return sendWhatsAppText({
    toPhoneCountryCode: wa.phoneCountryCode,
    toPhone: wa.phone,
    message,
    ...extra,
  });
}

async function sendConsultancyWhatsAppNotifications({
  user,
  assignee,
  parentCoach,
  referenceNumber,
  zoomJoinUrl,
  totalAmount,
  documentUrl,
  fileName,
  healthConcernTitle,
  paidAt,
}) {
  const results = { user: null, assignee: null, parentCoach: null };
  const clientName = firstName(user?.name || "User");
  const bookedFor = pwcBookedForLabel({ healthConcernTitle, paidAt });
  const receiptName = trim(fileName, `${trim(referenceNumber, "Payment-Receipt")}.pdf`);

  results.user = await sendNamedWhatsAppTemplate({
    templateKey: "invoice",
    person: user,
    params: [firstName(user?.name)],
    documentUrl,
    fileName: receiptName,
  });

  if (assignee && assignee.type !== "admin") {
    results.assignee = await sendNamedWhatsAppTemplate({
      templateKey: "pwcCoach",
      person: assignee,
      params: [firstName(assignee?.name), clientName, bookedFor],
    });
  }

  if (
    parentCoach &&
    assignee?.type === "assistant_wellness_coach" &&
    parentCoach.id !== assignee.id
  ) {
    results.parentCoach = await sendNamedWhatsAppTemplate({
      templateKey: "pwcCoach",
      person: parentCoach,
      params: [firstName(parentCoach?.name), clientName, bookedFor],
    });
  }

  return results;
}

async function sendCoachAssignmentNotifications({ user, assignee, assigneeType }) {
  const coachLabel =
    assigneeType === "assistant_wellness_coach" ? "assistant wellness coach" : "wellness coach";
  return {
    user: await notifyPerson(
      user,
      `You have been assigned to ${assignee?.name || `your ${coachLabel}`}. They will reach out to schedule your consultancy session.`
    ),
    assignee: await notifyPerson(
      assignee,
      `A new client has been assigned to you: ${user?.name || "User"} (${user?.email || user?.phone || "contact in portal"}).`
    ),
  };
}

async function sendChallengePaymentWhatsApp({
  user,
  challenge,
  referenceNumber,
  totalAmount,
  template,
}) {
  const userWa = resolveWhatsappNumber(user);
  if (!userWa) return { user: { sent: false, reason: "missing_phone" } };

  const title = challenge?.title || "Challenge";
  const amount = Number(totalAmount) || 0;
  const ref = referenceNumber || "";
  const name = user?.name || "there";
  const custom = trim(template);
  const message = custom
    ? custom
        .replace(/\{name\}/gi, name)
        .replace(/\{title\}/gi, title)
        .replace(/\{amount\}/gi, String(amount))
        .replace(/\{ref\}/gi, ref)
        .replace(/\{reference\}/gi, ref)
    : `Thank you for joining ${title}. Payment of Rs. ${amount} received (Ref: ${ref}). ` +
      `A wellness coach will call you shortly to guide you through the next steps.`;

  return {
    user: await sendWhatsAppText({
      toPhoneCountryCode: userWa.phoneCountryCode,
      toPhone: userWa.phone,
      message,
    }),
  };
}

module.exports = {
  formatE164,
  toBhashPhone,
  firstName,
  bhashParams,
  formatInrAmount,
  pwcBookedForLabel,
  NAMED_TEMPLATES,
  SLOT_TEMPLATE_BY_STEP,
  slotTemplateKeyForStep,
  resolveNamedTemplate,
  sendNamedWhatsAppTemplate,
  sendWhatsAppOtp,
  sendWhatsAppText,
  sendOnboardingReminderWhatsApp,
  sendWhatsAppDocument,
  sendConsultancyWhatsAppNotifications,
  sendCoachAssignmentNotifications,
  sendChallengePaymentWhatsApp,
};

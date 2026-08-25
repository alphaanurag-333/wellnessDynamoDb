const AppError = require("../utils/AppError");
const { getAccountById } = require("../models/accountModel");
const { emitAdminActivity } = require("./adminActivityService");
const { sendWhatsAppText } = require("../utils/whatsapp");
const { resolveWhatsappNumber } = require("./meetingAssigneeService");

function uniqueAccountIds(values) {
  const seen = new Set();
  const ids = [];
  for (const value of values || []) {
    const id = String(value || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

async function sendTeamReminders({ actor, accountIds, message }) {
  const body = String(message || "").trim();
  if (!body) throw new AppError("Write a reminder message first", 400);

  const senderId = String(actor?.id || "").trim();
  const senderName = String(actor?.displayName || "Admin").trim() || "Admin";
  const ids = uniqueAccountIds(accountIds).filter((id) => id !== senderId);
  if (!ids.length) throw new AppError("No team members to notify", 400);

  const sent = [];
  for (const id of ids) {
    const account = await getAccountById(id);
    const status = String(account?.status || "").toLowerCase();
    if (!account || status !== "active") continue;

    await emitAdminActivity({
      kind: "reminder",
      title: body,
      from: senderName,
      icon: "🔔",
      actorType: "admin",
      actorId: senderId || null,
      actorName: senderName,
      recipientAccountId: account.id,
      referenceType: "team_reminder",
      referenceId: account.id,
      href: "/pending",
    });

    sent.push({
      id: account.id,
      name: String(account.name || "").trim() || "Team member",
    });
  }

  if (!sent.length) throw new AppError("No team members to notify", 400);
  return sent;
}

async function sendTeamWhatsAppReminders({ actor, accountIds, message }) {
  const body = String(message || "").trim();
  if (!body) throw new AppError("Write a reminder message first", 400);

  const senderId = String(actor?.id || "").trim();
  const ids = uniqueAccountIds(accountIds).filter((id) => id !== senderId);
  if (!ids.length) throw new AppError("No team members to notify", 400);

  const sent = [];
  const failed = [];

  for (const id of ids) {
    const account = await getAccountById(id);
    const status = String(account?.status || "").toLowerCase();
    if (!account || status !== "active") continue;

    const name = String(account.name || "").trim() || "Team member";
    const wa = resolveWhatsappNumber(account);
    if (!wa) {
      failed.push({ id: account.id, name, reason: "missing_phone" });
      continue;
    }

    const firstName = name.split(/\s+/).filter(Boolean)[0] || name;
    const result = await sendWhatsAppText({
      toPhoneCountryCode: wa.phoneCountryCode,
      toPhone: wa.phone,
      message: body,
      params: `${firstName.replace(/,/g, " ")},${body.replace(/,/g, " ")}`,
      purpose: "reminder",
    });

    if (result.sent) {
      sent.push({ id: account.id, name, to: result.to || null });
    } else {
      failed.push({ id: account.id, name, reason: result.reason || "send_failed" });
    }
  }

  if (!sent.length && !failed.length) {
    throw new AppError("No team members to notify", 400);
  }
  if (!sent.length) {
    throw new AppError("Could not send WhatsApp to any recipients", 502);
  }

  return { sent, failed };
}

async function sendAccountWhatsAppReminder({ accountId, message }) {
  const body = String(message || "").trim();
  if (!body) throw new AppError("Write a reminder message first", 400);
  if (body.length > 2000) throw new AppError("message is too long", 400);

  const id = String(accountId || "").trim();
  if (!id) throw new AppError("accountId is required", 400);

  const account = await getAccountById(id);
  if (!account) throw new AppError("Account not found", 404);

  const wa = resolveWhatsappNumber(account);
  if (!wa) throw new AppError("No WhatsApp number on this account", 400);

  const name = String(account.name || "").trim() || "Team member";
  const firstName = name.split(/\s+/).filter(Boolean)[0] || name;

  const result = await sendWhatsAppText({
    toPhoneCountryCode: wa.phoneCountryCode,
    toPhone: wa.phone,
    message: body,
    params: `${firstName.replace(/,/g, " ")},${body.replace(/,/g, " ")}`,
    purpose: "reminder",
  });

  if (!result.sent) {
    throw new AppError(result.reason || "WhatsApp send failed", 502);
  }

  return {
    id: account.id,
    name: String(account.name || "").trim() || "Team member",
    to: result.to || null,
    messageId: result.messageId || null,
  };
}

module.exports = {
  sendTeamReminders,
  sendTeamWhatsAppReminders,
  sendAccountWhatsAppReminder,
};

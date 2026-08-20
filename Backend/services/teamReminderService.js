const AppError = require("../utils/AppError");
const { getAccountById } = require("../models/accountModel");
const { emitAdminActivity } = require("./adminActivityService");

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

module.exports = {
  sendTeamReminders,
};

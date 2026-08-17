const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listAccounts,
  getAccountById,
  updateAccount,
  toPublicAccount,
  normalizeVisibleFlag,
} = require("../../models/accountModel");

const COACH_ROLE = "wellness_coach";
const ASSISTANT_ROLE = "assistant_wellness_coach";
const AVATAR_COLORS = ["#22c55e", "#8b5cf6", "#14b8a6", "#f97316", "#a78bfa", "#a16207", "#5e6ad2", "#0d9488", "#ec7a45", "#6366f1"];

function initialsFromName(name) {
  return String(name || "")
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

function colorFromId(id) {
  const raw = String(id || "");
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) hash = (hash + raw.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function isAiEnabled(account) {
  return normalizeVisibleFlag(account?.aiEnabled, true);
}

function toPerson(account, extras = {}) {
  const pub = toPublicAccount(account) || account;
  return {
    id: pub.id,
    name: pub.name || "",
    initials: initialsFromName(pub.name),
    color: colorFromId(pub.id),
    enabled: isAiEnabled(pub),
    ...extras,
  };
}

async function listRoleAccounts(roleKey) {
  const { accounts } = await listAccounts({
    roleKey,
    status: "active",
    page: 1,
    limit: 200,
  });
  return accounts || [];
}

async function parentNameMap(accounts) {
  const ids = [...new Set(accounts.map((row) => row.parentAccountId).filter(Boolean))];
  const pairs = await Promise.all(
    ids.map(async (id) => {
      const parent = await getAccountById(id);
      return [id, parent?.name || ""];
    }),
  );
  return Object.fromEntries(pairs);
}

exports.listAiEnableController = asyncHandler(async (req, res) => {
  const [coachRows, assistantRows] = await Promise.all([
    listRoleAccounts(COACH_ROLE),
    listRoleAccounts(ASSISTANT_ROLE),
  ]);
  const parentNames = await parentNameMap(assistantRows);

  const coaches = coachRows
    .map((row) => toPerson(row, { role: "Wellness Coach" }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const assistants = assistantRows
    .map((row) => toPerson(row, { reportsTo: parentNames[row.parentAccountId] || "" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return res.status(200).json({
    status: true,
    coaches,
    assistants,
  });
});

exports.updateAiEnableController = asyncHandler(async (req, res) => {
  const account = await getAccountById(req.params.id);
  if (!account) throw new AppError("Team member not found", 404);

  const roleKeys = Array.isArray(account.roleKeys) ? account.roleKeys : [];
  if (!roleKeys.includes(COACH_ROLE) && !roleKeys.includes(ASSISTANT_ROLE)) {
    throw new AppError("AI enable can only be set for wellness coaches and assistants", 400);
  }

  if (req.body.enabled === undefined && req.body.aiEnabled === undefined) {
    throw new AppError("enabled is required", 400);
  }
  const enabled = normalizeVisibleFlag(
    req.body.enabled !== undefined ? req.body.enabled : req.body.aiEnabled,
    true,
  );

  const updated = await updateAccount(account.id, { aiEnabled: enabled });
  const extras = roleKeys.includes(ASSISTANT_ROLE)
    ? { reportsTo: (account.parentAccountId && (await getAccountById(account.parentAccountId))?.name) || "" }
    : { role: "Wellness Coach" };

  return res.status(200).json({
    status: true,
    message: enabled ? "AI enabled" : "AI disabled",
    person: toPerson(updated, extras),
  });
});

exports.bulkUpdateAiEnableController = asyncHandler(async (req, res) => {
  const group = String(req.body.group || req.body.roleKey || "").trim().toLowerCase();
  const roleKey = group === "assistant" || group === ASSISTANT_ROLE ? ASSISTANT_ROLE : group === "coach" || group === COACH_ROLE ? COACH_ROLE : "";
  if (!roleKey) throw new AppError("group must be coach or assistant", 400);
  if (req.body.enabled === undefined && req.body.aiEnabled === undefined) {
    throw new AppError("enabled is required", 400);
  }
  const enabled = normalizeVisibleFlag(
    req.body.enabled !== undefined ? req.body.enabled : req.body.aiEnabled,
    true,
  );

  const rows = await listRoleAccounts(roleKey);
  await Promise.all(rows.map((row) => updateAccount(row.id, { aiEnabled: enabled })));

  return res.status(200).json({
    status: true,
    message: enabled ? "AI enabled for the group" : "AI disabled for the group",
    updated: rows.length,
  });
});

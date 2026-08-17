/**
 * Wipe legacy staff identity tables and seed a clean Account-based team.
 *
 * Clears:
 *   Admin, WellnessCoach, AssistantWellnessCoach, Account, Role
 *   ReferralCode rows for wellness_coach / assistant_wellness_coach
 *   User coach assignment fields
 *
 * Seeds (Account source of truth + legacy mirrors with same ids):
 *   1 Super Admin, 2 Coaches, 2 Assistants, 1 Trainee, 1 Support
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedCleanStaffAccounts.js --confirm
 *   node --use-system-ca scripts/seedCleanStaffAccounts.js --confirm --dry-run
 */
require("dotenv").config();

const { DeleteCommand, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { tableExists, createAllTables, scanTable } = require("../migration/lib/helpers");
const { getTableDefinition } = require("../migration/lib/tableSchemas");
const { hashPassword } = require("../utils/password");
const { createAccount, getAccountByEmail } = require("../models/accountModel");
const { createRole, getRoleBySlug } = require("../models/roleModel");
const { listSpecializations } = require("../models/specializationModel");
const {
  deleteReferralCodeRecord,
  registerReferralCode,
  generateUniqueReferralCode,
} = require("../models/referralCodeModel");
const { ALL_ASSISTANT_PERMISSIONS } = require("../config/assistantPermissionCatalog");
const { ALL_TRAINEE_PERMISSIONS } = require("../config/traineePermissionCatalog");
const { ALL_SUPPORT_PERMISSIONS } = require("../config/supportPermissionCatalog");
const { buildPhoneKey, normalizePhone, normalizeCountryCode, normalizeEmail } = require("../models/userModel");

const STAFF_TABLES = ["Admin", "WellnessCoach", "AssistantWellnessCoach", "Account", "Role"];
const DEFAULT_PASSWORD = process.env.SEED_STAFF_PASSWORD || "Admin@12345";

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function ensureAccountTable() {
  if (await tableExists("Account")) return;
  const definition = getTableDefinition("Account");
  if (!definition) throw new Error("Missing Account table definition");
  console.log("[Account] creating table...");
  await createAllTables([definition]);
}

async function deleteAllItems(tableName) {
  if (!(await tableExists(tableName))) {
    console.log(`  [${tableName}] missing — skip`);
    return 0;
  }
  const items = await scanTable(tableName);
  let deleted = 0;
  for (const item of items) {
    if (item?.id == null) continue;
    await docClient.send(new DeleteCommand({ TableName: tableName, Key: { id: item.id } }));
    deleted += 1;
  }
  console.log(`  [${tableName}] deleted ${deleted} row(s)`);
  return deleted;
}

async function wipeStaffReferralCodes() {
  if (!(await tableExists("ReferralCode"))) {
    console.log("  [ReferralCode] missing — skip");
    return 0;
  }
  const items = await scanTable("ReferralCode");
  let deleted = 0;
  for (const item of items) {
    const type = String(item.entityType || "").toLowerCase();
    if (type !== "wellness_coach" && type !== "assistant_wellness_coach") continue;
    if (!item.referralCode) continue;
    await deleteReferralCodeRecord(item.referralCode);
    deleted += 1;
  }
  console.log(`  [ReferralCode] deleted ${deleted} staff code(s)`);
  return deleted;
}

async function clearUserCoachAssignments() {
  if (!(await tableExists("User"))) {
    console.log("  [User] missing — skip assignment clear");
    return 0;
  }
  const items = await scanTable("User");
  let updated = 0;
  const now = new Date().toISOString();
  for (const user of items) {
    if (!user?.id) continue;
    if (!user.assignedCoachId && !user.assignedCoachType && !user.parentCoachId) continue;
    await docClient.send(
      new UpdateCommand({
        TableName: "User",
        Key: { id: user.id },
        UpdateExpression:
          "REMOVE assignedCoachId, assignedCoachType, parentCoachId, assignmentStatus, assignmentSource, assignedAt SET updatedAt = :u",
        ExpressionAttributeValues: { ":u": now },
      })
    );
    updated += 1;
  }
  console.log(`  [User] cleared coach assignment on ${updated} user(s)`);
  return updated;
}

async function seedRoleTemplates() {
  const seeds = [
    {
      name: "Default Assistant",
      slug: "default-assistant",
      scope: "ASSISTANT",
      permissions: ALL_ASSISTANT_PERMISSIONS,
    },
    {
      name: "Default Trainee",
      slug: "default-trainee",
      scope: "TRAINEE",
      permissions: ALL_TRAINEE_PERMISSIONS,
    },
    {
      name: "Default Support",
      slug: "default-support",
      scope: "SUPPORT",
      permissions: ALL_SUPPORT_PERMISSIONS,
    },
  ];
  const out = {};
  for (const seed of seeds) {
    let role = await getRoleBySlug(seed.slug);
    if (!role) {
      role = await createRole({
        name: seed.name,
        slug: seed.slug,
        scope: seed.scope,
        permissions: seed.permissions,
        status: "active",
      });
      console.log(`  [Role] created ${seed.slug}`);
    } else {
      console.log(`  [Role] exists ${seed.slug}`);
    }
    out[seed.scope] = role;
  }
  return out;
}

/** Access Control CONSOLE templates keyed by Account roleKey. */
async function loadConsoleRolesByAccountKey() {
  const { ROLE_KEY_META, UI_TO_ACCOUNT_ROLE } = require("../config/consolePermissionCatalog");
  const out = {};
  for (const [uiKey, meta] of Object.entries(ROLE_KEY_META)) {
    const role = await getRoleBySlug(meta.slug, { scope: "CONSOLE" });
    if (!role) continue;
    const accountKey = UI_TO_ACCOUNT_ROLE[uiKey];
    if (accountKey) out[accountKey] = role;
  }
  return out;
}

async function pickSpecializationId() {
  try {
    const { specializations } = await listSpecializations({
      status: "active",
      page: 1,
      limit: 5,
    });
    return specializations?.[0]?.id || null;
  } catch {
    return null;
  }
}

async function ensureAccount(payload) {
  const existing = await getAccountByEmail(payload.email);
  if (existing) {
    console.log(`  [Account] exists ${payload.email}`);
    return existing;
  }
  const account = await createAccount(payload);
  console.log(
    `  [Account] ${payload.email} → ${account.id} [${(payload.memberships || [])
      .map((m) => m.roleKey)
      .join(", ")}]`
  );
  return account;
}

async function putAdminMirror(account, passwordHash) {
  if (!(await tableExists("Admin"))) return;
  await docClient.send(
    new PutCommand({
      TableName: "Admin",
      Item: {
        id: account.id,
        name: account.name,
        email: account.email,
        password: passwordHash,
        phone: account.phone || null,
        profileImage: null,
        resetPasswordToken: null,
        resetPasswordExpire: null,
        status: "active",
        isSuperAdmin: Boolean(account.isSuperAdmin),
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    })
  );
  console.log(`  [Admin] mirror ${account.email}`);
}

async function putCoachMirror(account, passwordHash, referralCode) {
  if (!(await tableExists("WellnessCoach"))) return;
  const phoneCountryCode = normalizeCountryCode(account.phoneCountryCode || "+91");
  const phone = normalizePhone(account.phone);
  await docClient.send(
    new PutCommand({
      TableName: "WellnessCoach",
      Item: {
        id: account.id,
        name: account.name,
        email: account.email,
        phoneCountryCode,
        phone,
        phoneKey: buildPhoneKey(phoneCountryCode, phone),
        profileImage: null,
        bio: account.bio || null,
        specializationId: account.specializationId || null,
        country: account.country || null,
        state: account.state || null,
        city: account.city || null,
        password: passwordHash,
        fcmId: null,
        status: "active",
        approvalStatus: account.approvalStatus || "approved",
        webVisible: true,
        appVisible: true,
        referralCode,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    })
  );
  await registerReferralCode({
    referralCode,
    entityType: "wellness_coach",
    entityId: account.id,
    ownerCoachId: account.id,
  });
  console.log(`  [WellnessCoach] mirror ${account.email} code=${referralCode}`);
}

async function putAssistantMirror(account, passwordHash, parentId, referralCode) {
  if (!(await tableExists("AssistantWellnessCoach"))) return;
  const phoneCountryCode = normalizeCountryCode(account.phoneCountryCode || "+91");
  const phone = normalizePhone(account.phone);
  await docClient.send(
    new PutCommand({
      TableName: "AssistantWellnessCoach",
      Item: {
        id: account.id,
        wellnessCoachId: parentId,
        name: account.name,
        email: account.email,
        phoneCountryCode,
        phone,
        phoneKey: buildPhoneKey(phoneCountryCode, phone),
        profileImage: null,
        designation: account.designation || "Assistant Wellness Coach",
        password: passwordHash,
        fcmId: null,
        status: "active",
        webVisible: true,
        appVisible: true,
        referralCode,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    })
  );
  await registerReferralCode({
    referralCode,
    entityType: "assistant_wellness_coach",
    entityId: account.id,
    ownerCoachId: parentId,
  });
  console.log(`  [Assistant] mirror ${account.email} code=${referralCode}`);
}

async function run() {
  const dryRun = hasFlag("--dry-run");
  const confirm = hasFlag("--confirm");

  if (!confirm) {
    console.error("Refusing to wipe without --confirm");
    console.error("Usage: node --use-system-ca scripts/seedCleanStaffAccounts.js --confirm");
    process.exitCode = 1;
    return;
  }

  console.log(dryRun ? "=== DRY RUN ===" : "=== WIPE + SEED STAFF ACCOUNTS ===");
  console.log(`Shared password: ${DEFAULT_PASSWORD}\n`);

  await ensureAccountTable();

  if (dryRun) {
    for (const table of STAFF_TABLES) {
      const exists = await tableExists(table);
      const count = exists ? (await scanTable(table)).length : 0;
      console.log(`  would wipe ${table}: ${count} row(s)`);
    }
    console.log("  would wipe staff ReferralCodes + clear User coach assignments");
    console.log("  would seed super admin + team");
    return;
  }

  console.log("1) Wiping...");
  for (const table of STAFF_TABLES) {
    await deleteAllItems(table);
  }
  await wipeStaffReferralCodes();
  await clearUserCoachAssignments();

  console.log("\n2) Role templates...");
  await seedRoleTemplates();
  const { ensureConsoleRolesSeeded } = require("../controllers/accountController/accessController");
  const consoleSeed = await ensureConsoleRolesSeeded();
  console.log(
    `  [CONSOLE] baselines ${
      consoleSeed.created.length ? `created: ${consoleSeed.created.join(", ")}` : "already present"
    }`
  );
  const consoleRoles = await loadConsoleRolesByAccountKey();

  console.log("\n3) Seeding accounts...");
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const specializationId = await pickSpecializationId();

  const superAdmin = await ensureAccount({
    name: "Priya Sharma",
    email: normalizeEmail("admin@irwellness.local"),
    password: passwordHash,
    phone: "9000000001",
    phoneCountryCode: "+91",
    status: "active",
    isSuperAdmin: true,
    defaultRoleKey: "admin",
    sourceLegacyType: "admin",
    memberships: [
      {
        roleKey: "admin",
        roleId: consoleRoles.admin?.id || null,
        status: "active",
        parentAccountId: null,
      },
    ],
  });
  await putAdminMirror(superAdmin, passwordHash);

  const coachAnita = await ensureAccount({
    name: "Dr. Anita Rao",
    email: normalizeEmail("coach.anita@irwellness.local"),
    password: passwordHash,
    phone: "9000000002",
    phoneCountryCode: "+91",
    status: "active",
    approvalStatus: "approved",
    specializationId,
    bio: "Lead HEAL coach — metabolic health and sustainable lifestyle change.",
    country: "India",
    state: "Maharashtra",
    city: "Mumbai",
    webVisible: true,
    appVisible: true,
    defaultRoleKey: "wellness_coach",
    sourceLegacyType: "wellness_coach",
    memberships: [
      {
        roleKey: "wellness_coach",
        roleId: consoleRoles.wellness_coach?.id || null,
        status: "active",
        parentAccountId: null,
      },
    ],
  });
  await putCoachMirror(coachAnita, passwordHash, await generateUniqueReferralCode({ entityType: "wellness_coach" }));

  const coachRahul = await ensureAccount({
    name: "Rahul Mehta",
    email: normalizeEmail("coach.rahul@irwellness.local"),
    password: passwordHash,
    phone: "9000000003",
    phoneCountryCode: "+91",
    status: "active",
    approvalStatus: "approved",
    specializationId,
    bio: "Wellness coach focused on strength, recovery, and daily habits.",
    country: "India",
    state: "Karnataka",
    city: "Bengaluru",
    webVisible: true,
    appVisible: true,
    defaultRoleKey: "wellness_coach",
    sourceLegacyType: "wellness_coach",
    memberships: [
      {
        roleKey: "wellness_coach",
        roleId: consoleRoles.wellness_coach?.id || null,
        status: "active",
        parentAccountId: null,
      },
    ],
  });
  await putCoachMirror(coachRahul, passwordHash, await generateUniqueReferralCode({ entityType: "wellness_coach" }));

  const awcNeha = await ensureAccount({
    name: "Neha Kapoor",
    email: normalizeEmail("awc.neha@irwellness.local"),
    password: passwordHash,
    phone: "9000000004",
    phoneCountryCode: "+91",
    status: "active",
    designation: "Assistant Wellness Coach",
    parentAccountId: coachAnita.id,
    defaultRoleKey: "assistant_wellness_coach",
    sourceLegacyType: "assistant_wellness_coach",
    memberships: [
      {
        roleKey: "assistant_wellness_coach",
        roleId: consoleRoles.assistant_wellness_coach?.id || null,
        status: "active",
        parentAccountId: coachAnita.id,
      },
    ],
  });
  await putAssistantMirror(
    awcNeha,
    passwordHash,
    coachAnita.id,
    await generateUniqueReferralCode({ entityType: "assistant_wellness_coach" })
  );

  const awcVikram = await ensureAccount({
    name: "Vikram Singh",
    email: normalizeEmail("awc.vikram@irwellness.local"),
    password: passwordHash,
    phone: "9000000005",
    phoneCountryCode: "+91",
    status: "active",
    designation: "Assistant Wellness Coach",
    parentAccountId: coachRahul.id,
    defaultRoleKey: "assistant_wellness_coach",
    sourceLegacyType: "assistant_wellness_coach",
    memberships: [
      {
        roleKey: "assistant_wellness_coach",
        roleId: consoleRoles.assistant_wellness_coach?.id || null,
        status: "active",
        parentAccountId: coachRahul.id,
      },
    ],
  });
  await putAssistantMirror(
    awcVikram,
    passwordHash,
    coachRahul.id,
    await generateUniqueReferralCode({ entityType: "assistant_wellness_coach" })
  );

  await ensureAccount({
    name: "Arjun Patel",
    email: normalizeEmail("trainee.arjun@irwellness.local"),
    password: passwordHash,
    phone: "9000000006",
    phoneCountryCode: "+91",
    status: "active",
    parentAccountId: coachAnita.id,
    defaultRoleKey: "trainee",
    memberships: [
      {
        roleKey: "trainee",
        roleId: consoleRoles.trainee?.id || null,
        status: "active",
        parentAccountId: coachAnita.id,
      },
    ],
  });

  await ensureAccount({
    name: "Maya Joshi",
    email: normalizeEmail("support.maya@irwellness.local"),
    password: passwordHash,
    phone: "9000000007",
    phoneCountryCode: "+91",
    status: "active",
    defaultRoleKey: "support",
    memberships: [
      {
        roleKey: "support",
        roleId: consoleRoles.support?.id || null,
        status: "active",
        parentAccountId: null,
      },
    ],
  });

  console.log("\n=== DONE ===");
  console.log("POST http://localhost:5000/api/account/auth/login\n");
  console.log("| Role        | Email                          | Password     |");
  console.log("|-------------|--------------------------------|--------------|");
  console.log(`| Super Admin | admin@irwellness.local         | ${DEFAULT_PASSWORD} |`);
  console.log(`| Coach       | coach.anita@irwellness.local   | ${DEFAULT_PASSWORD} |`);
  console.log(`| Coach       | coach.rahul@irwellness.local   | ${DEFAULT_PASSWORD} |`);
  console.log(`| Assistant   | awc.neha@irwellness.local      | ${DEFAULT_PASSWORD} |`);
  console.log(`| Assistant   | awc.vikram@irwellness.local    | ${DEFAULT_PASSWORD} |`);
  console.log(`| Trainee     | trainee.arjun@irwellness.local | ${DEFAULT_PASSWORD} |`);
  console.log(`| Support     | support.maya@irwellness.local  | ${DEFAULT_PASSWORD} |`);
  console.log("\nUI: /updatedadmin/login");
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exitCode = 1;
});

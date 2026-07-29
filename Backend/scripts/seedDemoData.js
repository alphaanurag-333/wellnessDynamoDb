/**
 * Seed genuine demo data for the unified Accounts / Teams panel.
 *
 * Prerequisites: tables exist (run scripts/ensureAllTables.js first).
 *
 * Seeds:
 *  - Super Admin (Accounts)
 *  - Roles: Content Manager, Wellness Coach, Assistant Coach
 *  - Specializations catalog
 *  - Team: 1 coach + 1 assistant (with referral codes)
 *  - Sample app Users (Seek + Heal clients under the coach)
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedDemoData.js
 */
require("dotenv").config();

const { hashPassword } = require("../utils/password");
const {
  createAccount,
  getAccountByEmail,
  updateAccount,
} = require("../models/accountModel");
const {
  createRole,
  getRoleBySlug,
  listRoles,
} = require("../models/roleModel");
const {
  registerReferralCode,
  generateUniqueReferralCode,
} = require("../models/referralCodeModel");
const {
  createSpecialization,
  getSpecializationByTitleKey,
  buildTitleKey,
} = require("../models/specializationModel");
const { createUser, getUserByEmail } = require("../models/userModel");
const {
  ALL_PERMISSIONS,
  getDefaultCoachPermissionList,
} = require("../config/permissionCatalog");

const PASSWORD = "12345678";

const SPECIALIZATIONS = [
  {
    title: "General Wellness",
    description:
      "Holistic lifestyle coaching covering nutrition, movement, sleep, and daily habits.",
  },
  {
    title: "Weight Loss & Metabolism",
    description: "Sustainable fat-loss programs with meal planning and activity tracking.",
  },
  {
    title: "Diabetes Reversal Coach",
    description: "Lifestyle approach to blood sugar management and insulin sensitivity.",
  },
  {
    title: "PCOS & Hormonal Balance",
    description: "Personalized plans for PCOS covering cycle health and hormonal balance.",
  },
  {
    title: "Gut Health & Digestion",
    description: "Restore digestive balance with meal timing and gut-friendly habits.",
  },
];

function adminStaffPermissions() {
  // Ops / content manager — not care-scoped (no clientHub / meal-approvals / my-assistants).
  return ALL_PERMISSIONS.filter((slug) => {
    if (slug.startsWith("users.clientHub.")) return false;
    if (slug.startsWith("meal-approvals.")) return false;
    if (slug.startsWith("my-assistants.")) return false;
    if (slug.startsWith("team.")) return true;
    return (
      slug.startsWith("dashboard.") ||
      slug.startsWith("users.") ||
      slug.startsWith("banners.") ||
      slug.startsWith("faq.") ||
      slug.startsWith("notifications.") ||
      slug.startsWith("settings.") ||
      slug.startsWith("specializations.") ||
      slug.startsWith("health-") ||
      slug.startsWith("programs.") ||
      slug.startsWith("static-pages.") ||
      slug.startsWith("contact-inquiries.")
    );
  });
}

async function ensureRole({ name, slug, permissions }) {
  const existing = await getRoleBySlug(slug);
  if (existing) {
    console.log(`  role exists: ${existing.name} (${existing.id})`);
    return existing;
  }
  const role = await createRole({ name, slug, permissions, status: "active" });
  console.log(`  role created: ${role.name} (${role.id})`);
  return role;
}

async function ensureSpecialization(row) {
  const titleKey = buildTitleKey(row.title);
  let spec = await getSpecializationByTitleKey(titleKey);
  if (spec) {
    console.log(`  specialization exists: ${spec.title}`);
    return spec;
  }
  spec = await createSpecialization({
    title: row.title,
    description: row.description,
    status: "active",
  });
  console.log(`  specialization created: ${spec.title}`);
  return spec;
}

async function ensureSuperAdmin() {
  const email = "admin@gmail.com";
  const existing = await getAccountByEmail(email);
  if (existing) {
    console.log(`  super admin exists: ${email}`);
    return existing;
  }
  const account = await createAccount({
    name: "Super Admin",
    email,
    password: await hashPassword(PASSWORD),
    phone: "9999999999",
    phoneCountryCode: "+91",
    status: "active",
    isSuperAdmin: true,
    accountKind: "admin",
  });
  console.log(`  super admin created: ${email} / ${PASSWORD}`);
  return account;
}

async function ensureTeamMember({
  name,
  email,
  phone,
  roleId,
  accountKind,
  parentAccountId = null,
  specializationId = null,
}) {
  const existing = await getAccountByEmail(email);
  if (existing) {
    console.log(`  team member exists: ${email}`);
    return existing;
  }

  const referralCode =
    accountKind === "coach" || accountKind === "assistant"
      ? await generateUniqueReferralCode()
      : null;

  const account = await createAccount({
    name,
    email,
    password: await hashPassword(PASSWORD),
    phone,
    phoneCountryCode: "+91",
    status: "active",
    isSuperAdmin: false,
    roleId,
    accountKind,
    parentAccountId,
    specializationId,
    referralCode,
    approvalStatus: accountKind === "coach" || accountKind === "assistant" ? "approved" : null,
    webVisible: true,
    appVisible: true,
  });

  if (referralCode) {
    await registerReferralCode({
      referralCode,
      entityType: accountKind === "assistant" ? "assistant_wellness_coach" : "wellness_coach",
      entityId: account.id,
      ownerCoachId: parentAccountId || account.id,
    });
  }

  console.log(
    `  team member created: ${email} / ${PASSWORD}` +
      (referralCode ? ` (ref: ${referralCode})` : "")
  );
  return account;
}

async function ensureUser({
  name,
  email,
  phone,
  userTier = "seek",
  parentCoachId = null,
  assignedCoachId = null,
  assignedCoachType = null,
}) {
  const existing = await getUserByEmail(email);
  if (existing) {
    console.log(`  user exists: ${email}`);
    return existing;
  }

  const user = await createUser({
    name,
    email,
    password: await hashPassword(PASSWORD),
    phone,
    phoneCountryCode: "+91",
    status: "active",
    userTier,
    parentCoachId,
    assignedCoachId: assignedCoachId || parentCoachId,
    assignedCoachType: assignedCoachType || (parentCoachId ? "wellness_coach" : null),
    assignmentStatus: parentCoachId ? "assigned" : "pending",
  });

  console.log(`  user created: ${email} (${userTier})`);
  return user;
}

async function main() {
  console.log("=== Seed demo data ===\n");

  console.log("1) Super Admin");
  await ensureSuperAdmin();

  console.log("\n2) Roles");
  const contentRole = await ensureRole({
    name: "Content Manager",
    slug: "content-manager",
    permissions: adminStaffPermissions(),
  });
  const coachRole = await ensureRole({
    name: "Wellness Coach",
    slug: "wellness-coach",
    permissions: getDefaultCoachPermissionList("wellness_coach"),
  });
  const assistantRole = await ensureRole({
    name: "Assistant Coach",
    slug: "assistant-coach",
    permissions: getDefaultCoachPermissionList("assistant_wellness_coach"),
  });

  // Keep a role that can manage Team Members
  await ensureRole({
    name: "Team Lead",
    slug: "team-lead",
    permissions: [
      ...adminStaffPermissions().filter((s) => !s.startsWith("team.")),
      "team.view",
      "team.edit",
      "team.delete",
      "specializations.view",
      "specializations.edit",
    ],
  });

  console.log("\n3) Specializations");
  const specs = [];
  for (const row of SPECIALIZATIONS) {
    specs.push(await ensureSpecialization(row));
  }
  const generalSpec = specs[0];

  console.log("\n4) Team members");
  const coach = await ensureTeamMember({
    name: "Dr. Ananya Sharma",
    email: "coach@gmail.com",
    phone: "9876543210",
    roleId: coachRole.id,
    accountKind: "coach",
    specializationId: generalSpec?.id || null,
  });

  const assistant = await ensureTeamMember({
    name: "Riya Patel",
    email: "assistant@gmail.com",
    phone: "9876543211",
    roleId: assistantRole.id,
    accountKind: "assistant",
    parentAccountId: coach.id,
    specializationId: specs[1]?.id || null,
  });

  await ensureTeamMember({
    name: "Karan Mehta",
    email: "content@gmail.com",
    phone: "9876543212",
    roleId: contentRole.id,
    accountKind: "admin",
  });

  // Ensure coach referral stays registered if re-seeded partially
  if (coach.referralCode && !coach.parentAccountId) {
    // no-op; already registered on create
  }

  console.log("\n5) Sample app users (clients)");
  await ensureUser({
    name: "Priya Nair",
    email: "priya.nair@example.com",
    phone: "9811111111",
    userTier: "heal",
    parentCoachId: coach.id,
    assignedCoachId: coach.id,
    assignedCoachType: "wellness_coach",
  });
  await ensureUser({
    name: "Amit Verma",
    email: "amit.verma@example.com",
    phone: "9822222222",
    userTier: "heal",
    parentCoachId: coach.id,
    assignedCoachId: assistant.id,
    assignedCoachType: "assistant_wellness_coach",
  });
  await ensureUser({
    name: "Sneha Kapoor",
    email: "sneha.kapoor@example.com",
    phone: "9833333333",
    userTier: "seek",
  });
  await ensureUser({
    name: "Rohan Desai",
    email: "rohan.desai@example.com",
    phone: "9844444444",
    userTier: "consultancy_only",
    parentCoachId: coach.id,
    assignedCoachId: coach.id,
    assignedCoachType: "wellness_coach",
  });

  const { roles } = await listRoles({ limit: 50 });
  console.log("\n=== Done ===");
  console.log(`Roles in DB: ${roles.length}`);
  console.log("\nLogin credentials (password for all: 12345678)");
  console.log("  Super Admin:  admin@gmail.com");
  console.log("  Coach:        coach@gmail.com");
  console.log("  Assistant:    assistant@gmail.com");
  console.log("  Content ops:  content@gmail.com");
  console.log("\nClient users (app):");
  console.log("  priya.nair@example.com (Heal → coach)");
  console.log("  amit.verma@example.com (Heal → assistant)");
  console.log("  sneha.kapoor@example.com (Seek, unassigned)");
  console.log("  rohan.desai@example.com (Consultancy → coach)");

  // Touch coach updatedAt so list indexes stay fresh after partial re-runs
  await updateAccount(coach.id, { designation: "Lead Wellness Coach" }).catch(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

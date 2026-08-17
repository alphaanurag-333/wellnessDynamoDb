/**
 * Wipe all app users and seed HEAL test clients across different programs.
 *
 * Clears:
 *   User (hard delete)
 *   UserProgram
 *   ReferralCode rows for entityType=user
 *
 * Seeds HEAL users with distinct primary health concerns + purchased programs
 * so Admin client-profile (Diabetes Reversal compact vs full workspace) can be tested.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedTestUsers.js --confirm
 *   node --use-system-ca scripts/seedTestUsers.js --confirm --dry-run
 */
require("dotenv").config();

const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { tableExists, scanTable } = require("../migration/lib/helpers");
const { hashPassword } = require("../utils/password");
const { createUser } = require("../models/userModel");
const {
  listHealthConcerns,
  createHealthConcern,
  updateHealthConcern,
} = require("../models/healthConcernModel");
const { listActiveProgramCatalog } = require("../models/programCatalogModel");
const { createUserProgram } = require("../models/userProgramModel");
const { findProgramForConcern } = require("../services/adminHealConversionService");
const {
  deleteReferralCodeRecord,
} = require("../models/referralCodeModel");

const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD || "User@12345";

const CONCERN_SEEDS = [
  {
    title: "Diabetes Reversal",
    description: "Blood sugar management and lifestyle reversal protocol.",
    programTitleHint: "Diabetes Reversal",
  },
  {
    title: "Fat Loss",
    description: "Sustainable fat loss and metabolic health.",
    programTitleHint: "Weight Loss",
  },
  {
    title: "Thyroid Care",
    description: "Thyroid-focused nutrition and lifestyle support.",
    programTitleHint: "Thyroid",
  },
  {
    title: "PCOD / PCOS",
    description: "Hormonal balance and PCOS/PCOD management.",
    programTitleHint: "PCOS",
  },
  {
    title: "Hypertension",
    description: "Blood pressure and heart-health lifestyle coaching.",
    programTitleHint: "Heart",
  },
  {
    title: "Everyday Wellness",
    description: "General wellbeing and habit building.",
    programTitleHint: "Seek to Heal",
  },
];

const TEST_USERS = [
  {
    name: "Aisha Diabetes",
    email: "test.diabetes@irwellness.local",
    phone: "9100000001",
    concernTitle: "Diabetes Reversal",
    gender: "female",
    city: "Mumbai",
  },
  {
    name: "Rohan Fat Loss",
    email: "test.fatloss@irwellness.local",
    phone: "9100000002",
    concernTitle: "Fat Loss",
    gender: "male",
    city: "Pune",
  },
  {
    name: "Meera Thyroid",
    email: "test.thyroid@irwellness.local",
    phone: "9100000003",
    concernTitle: "Thyroid Care",
    gender: "female",
    city: "Bengaluru",
  },
  {
    name: "Kavya PCOD",
    email: "test.pcod@irwellness.local",
    phone: "9100000004",
    concernTitle: "PCOD / PCOS",
    gender: "female",
    city: "Hyderabad",
  },
  {
    name: "Arjun Hypertension",
    email: "test.hypertension@irwellness.local",
    phone: "9100000005",
    concernTitle: "Hypertension",
    gender: "male",
    city: "Delhi",
  },
  {
    name: "Sneha Everyday",
    email: "test.everyday@irwellness.local",
    phone: "9100000006",
    concernTitle: "Everyday Wellness",
    gender: "female",
    city: "Chennai",
  },
  {
    name: "Seek Tester",
    email: "test.seek@irwellness.local",
    phone: "9100000007",
    concernTitle: "Fat Loss",
    gender: "male",
    city: "Ahmedabad",
    userTier: "seek",
    skipProgram: true,
  },
];

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function titleKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
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

async function wipeUserReferralCodes() {
  if (!(await tableExists("ReferralCode"))) {
    console.log("  [ReferralCode] missing — skip");
    return 0;
  }
  const items = await scanTable("ReferralCode");
  let deleted = 0;
  for (const item of items) {
    if (String(item.entityType || "").toLowerCase() !== "user") continue;
    if (!item.referralCode) continue;
    await deleteReferralCodeRecord(item.referralCode);
    deleted += 1;
  }
  console.log(`  [ReferralCode] deleted ${deleted} user code(s)`);
  return deleted;
}

async function pickCoach() {
  if (await tableExists("WellnessCoach")) {
    const coaches = (await scanTable("WellnessCoach")).filter(
      (row) => String(row.status || "active").toLowerCase() === "active"
    );
    if (coaches.length) {
      const preferred =
        coaches.find((c) => String(c.email || "").includes("anita")) || coaches[0];
      return {
        id: preferred.id,
        name: preferred.name,
        email: preferred.email,
        source: "WellnessCoach",
      };
    }
  }

  if (await tableExists("Account")) {
    const accounts = (await scanTable("Account")).filter((row) => {
      const memberships = Array.isArray(row.memberships) ? row.memberships : [];
      return memberships.some((m) => String(m.roleKey || "") === "wellness_coach");
    });
    if (accounts.length) {
      const preferred =
        accounts.find((a) => String(a.email || "").includes("anita")) || accounts[0];
      return {
        id: preferred.id,
        name: preferred.name,
        email: preferred.email,
        source: "Account",
      };
    }
  }

  return null;
}

async function ensureHealthConcerns(programs) {
  const existing = await listHealthConcerns({ page: 1, limit: 200, status: "active" });
  const byTitle = new Map(
    (existing.healthConcerns || []).map((row) => [titleKey(row.title), row])
  );
  const out = {};

  for (const seed of CONCERN_SEEDS) {
    let concern = byTitle.get(titleKey(seed.title));
    const matchedProgram =
      findProgramForConcern(programs, seed.title) ||
      findProgramForConcern(programs, seed.programTitleHint) ||
      null;

    if (!concern) {
      concern = await createHealthConcern({
        title: seed.title,
        description: seed.description,
        status: "active",
        recommendedCatalogProgramId: matchedProgram?.id || null,
      });
      console.log(
        `  [HealthConcern] created ${concern.title}` +
          (matchedProgram ? ` → ${matchedProgram.title}` : " (no program map)")
      );
    } else if (
      matchedProgram &&
      String(concern.recommendedCatalogProgramId || "") !== String(matchedProgram.id)
    ) {
      concern = await updateHealthConcern(concern.id, {
        recommendedCatalogProgramId: matchedProgram.id,
      });
      console.log(`  [HealthConcern] linked ${concern.title} → ${matchedProgram.title}`);
    } else {
      console.log(`  [HealthConcern] exists ${concern.title}`);
    }

    out[titleKey(seed.title)] = { concern, program: matchedProgram };
  }

  return out;
}

async function seedUser(row, concernMap, coach, passwordHash) {
  const mapped = concernMap[titleKey(row.concernTitle)];
  if (!mapped?.concern) {
    throw new Error(`Missing health concern for ${row.concernTitle}`);
  }

  const now = new Date().toISOString();
  const tier = row.userTier || "heal";
  const isHeal = tier === "heal";

  const user = await createUser({
    name: row.name,
    email: row.email,
    passwordHash,
    phoneCountryCode: "+91",
    phone: row.phone,
    whatsappSameAsMobile: true,
    gender: row.gender,
    country: "India",
    state: "Maharashtra",
    city: row.city,
    primaryHealthConcern: mapped.concern.id,
    termsAccepted: true,
    termsAcceptedAt: now,
    status: "active",
    userTier: tier,
    assignedCoachId: coach.id,
    assignedCoachType: "wellness_coach",
    parentCoachId: coach.id,
    assignmentStatus: "assigned",
    assignmentSource: "admin_manual",
    assignedAt: now,
    convertedAt: isHeal ? now : null,
    healPaidAt: isHeal ? now : null,
    paidOnboardingCompleted: isHeal,
    paidOnboardingStep: isHeal ? "completed" : null,
    paidOnboardingStepStatus: isHeal ? "completed" : null,
    energyExchangeEnabled: isHeal,
    programEnabled: false,
    programPurchased: false,
  });

  if (row.skipProgram || !isHeal) {
    console.log(`  [User] ${user.email} · ${tier} · ${row.concernTitle} (no program)`);
    return user;
  }

  if (!mapped.program) {
    throw new Error(`No catalog program mapped for concern ${row.concernTitle}`);
  }

  const program = await createUserProgram({
    userId: user.id,
    coachId: coach.id,
    coachType: "wellness_coach",
    catalogProgramId: mapped.program.id,
    title: mapped.program.title,
    programType: mapped.program.programType,
    description: mapped.program.description,
    price: mapped.program.price,
    currency: mapped.program.currency,
    enabled: true,
    status: "purchased",
    purchasedAt: now,
  });

  const { updateUser } = require("../models/userModel");
  await updateUser(user.id, {
    assignedProgramId: program.id,
    programEnabled: true,
    programPurchased: true,
    programPurchasedAt: now,
  });

  console.log(
    `  [User] ${user.email} · heal · ${row.concernTitle} → ${mapped.program.title}`
  );
  return user;
}

async function run() {
  const dryRun = hasFlag("--dry-run");
  const confirm = hasFlag("--confirm");

  if (!confirm) {
    console.error("Refusing to wipe users without --confirm");
    console.error("Usage: node --use-system-ca scripts/seedTestUsers.js --confirm");
    process.exitCode = 1;
    return;
  }

  console.log(dryRun ? "=== DRY RUN ===" : "=== WIPE + SEED TEST USERS ===");
  console.log(`Shared password: ${DEFAULT_PASSWORD}\n`);

  const coach = await pickCoach();
  if (!coach) {
    throw new Error(
      "No wellness coach found. Run: npm run seed:staff-accounts -- --confirm"
    );
  }
  console.log(`Coach: ${coach.name} <${coach.email}> (${coach.source})\n`);

  const programs = await listActiveProgramCatalog();
  if (!programs.length) {
    throw new Error("No active ProgramCatalog rows. Run: npm run seed:programs");
  }
  console.log(`Programs available: ${programs.length}`);

  if (dryRun) {
    const userCount = (await tableExists("User")) ? (await scanTable("User")).length : 0;
    const programCount = (await tableExists("UserProgram"))
      ? (await scanTable("UserProgram")).length
      : 0;
    console.log(`  would delete User: ${userCount}`);
    console.log(`  would delete UserProgram: ${programCount}`);
    console.log("  would wipe user ReferralCodes");
    console.log(`  would seed ${TEST_USERS.length} test users`);
    return;
  }

  console.log("\n1) Wiping...");
  await wipeUserReferralCodes();
  await deleteAllItems("UserProgram");
  await deleteAllItems("User");

  console.log("\n2) Ensuring health concerns + program links...");
  const concernMap = await ensureHealthConcerns(programs);

  console.log("\n3) Seeding users...");
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  for (const row of TEST_USERS) {
    await seedUser(row, concernMap, coach, passwordHash);
  }

  console.log("\n=== DONE ===");
  console.log("| Name               | Email                            | Concern            | Profile expect |");
  console.log("|--------------------|----------------------------------|--------------------|--------------|");
  console.log("| Aisha Diabetes     | test.diabetes@irwellness.local   | Diabetes Reversal  | compact       |");
  console.log("| Rohan Fat Loss     | test.fatloss@irwellness.local    | Fat Loss           | full         |");
  console.log("| Meera Thyroid      | test.thyroid@irwellness.local    | Thyroid Care       | full         |");
  console.log("| Kavya PCOD         | test.pcod@irwellness.local       | PCOD / PCOS        | full         |");
  console.log("| Arjun Hypertension | test.hypertension@irwellness.local | Hypertension     | full         |");
  console.log("| Sneha Everyday     | test.everyday@irwellness.local   | Everyday Wellness  | full         |");
  console.log("| Seek Tester        | test.seek@irwellness.local       | Fat Loss (SEEK)    | full         |");
  console.log(`\nPassword for all: ${DEFAULT_PASSWORD}`);
  console.log("Admin profile: Diabetes Reversal → compact; all other concerns → full.");
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exitCode = 1;
});

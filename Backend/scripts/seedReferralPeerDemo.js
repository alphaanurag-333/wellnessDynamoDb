/**
 * Seed 3 demo clients for peer referral tree testing (no wipe).
 *
 * Chain (under your coach tree):
 *   Coach code → Demo Alpha → Demo Beta → Demo Carol
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedReferralPeerDemo.js
 *   node --use-system-ca scripts/seedReferralPeerDemo.js --dry-run
 *   node --use-system-ca scripts/seedReferralPeerDemo.js --coach-code=IRW-WC-980
 */
require("dotenv").config();

const { hashPassword } = require("../utils/password");
const { createUser, getUserByEmail, getUserById } = require("../models/userModel");
const { correctUserReferralAttribution } = require("../models/userConversionModel");
const { resolveRegistrationReferralFields } = require("../services/registrationReferralService");
const { scanTable, tableExists } = require("../migration/lib/helpers");
const { getReferralCodeRecord } = require("../models/referralCodeModel");

const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD || "User@12345";

const DEMO_USERS = [
  {
    key: "alpha",
    name: "Demo Alpha (Peer)",
    email: "demo.referral.alpha@irwellness.local",
    phone: "9188800001",
    referralCode: "DEMO-PEER-A1",
    userTier: "maintenance",
    joinVia: "coach",
  },
  {
    key: "beta",
    name: "Demo Beta (Peer)",
    email: "demo.referral.beta@irwellness.local",
    phone: "9188800002",
    referralCode: "DEMO-PEER-B2",
    userTier: "maintenance",
    joinVia: "DEMO-PEER-A1",
  },
  {
    key: "carol",
    name: "Demo Carol (Peer)",
    email: "demo.referral.carol@irwellness.local",
    phone: "9188800003",
    referralCode: "DEMO-PEER-C3",
    userTier: "maintenance",
    joinVia: "DEMO-PEER-B2",
  },
];

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function readCoachCodeArg() {
  const prefixed = process.argv.find((arg) => arg.startsWith("--coach-code="));
  if (prefixed) return String(prefixed.split("=")[1] || "").trim().toUpperCase();
  const fromEnv = String(process.env.REFERRAL_DEMO_COACH_CODE || "").trim();
  return fromEnv ? fromEnv.toUpperCase() : "";
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
        referralCode: preferred.referralCode || null,
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
        referralCode: preferred.referralCode || null,
      };
    }
  }

  return null;
}

async function resolveCoachReferralCode(coach) {
  const explicit = readCoachCodeArg();
  if (explicit) {
    const record = await getReferralCodeRecord(explicit);
    if (!record) {
      throw new Error(`Coach referral code not found in registry: ${explicit}`);
    }
    return explicit;
  }

  const onCoach = String(coach?.referralCode || "")
    .trim()
    .toUpperCase();
  if (onCoach) return onCoach;

  if (coach?.id && (await tableExists("ReferralCode"))) {
    const rows = await scanTable("ReferralCode");
    const match = rows.find(
      (row) =>
        String(row.entityId || "") === String(coach.id) &&
        String(row.entityType || "").toLowerCase() === "wellness_coach"
    );
    if (match?.referralCode) return String(match.referralCode).trim().toUpperCase();
  }

  throw new Error(
    "Could not resolve coach referral code. Pass --coach-code=YOUR-COACH-CODE or set REFERRAL_DEMO_COACH_CODE"
  );
}

async function ensureDemoUser(spec, viaCode, { dryRun, passwordHash }) {
  const existing = await getUserByEmail(spec.email);
  if (existing) {
    console.log(`  [skip create] ${spec.email} exists · code ${existing.referralCode || "—"}`);
    if (viaCode && viaCode !== "coach") {
      if (dryRun) {
        console.log(`    would set joined via ${viaCode}`);
        return existing;
      }
      await correctUserReferralAttribution(existing.id, viaCode);
      const updated = await getUserById(existing.id);
      console.log(`    updated via ${updated.referredByCode || viaCode}`);
      return updated;
    }
    if (viaCode === "coach") {
      console.log("    (existing alpha — use Change on tree if coach link is wrong)");
    }
    return existing;
  }

  let referralFields = {};
  const coachCodeForAlpha =
    viaCode === "coach" ? spec._coachReferralCode : viaCode;

  if (coachCodeForAlpha) {
    referralFields = await resolveRegistrationReferralFields(coachCodeForAlpha, {
      strict: true,
    });
  }

  const payload = {
    name: spec.name,
    email: spec.email,
    passwordHash,
    phoneCountryCode: "+91",
    phone: spec.phone,
    whatsappSameAsMobile: true,
    gender: "other",
    country: "India",
    state: "Maharashtra",
    city: "Mumbai",
    termsAccepted: true,
    termsAcceptedAt: new Date().toISOString(),
    status: "active",
    userTier: spec.userTier,
    referralCode: spec.referralCode,
    ...referralFields,
  };

  if (dryRun) {
    console.log(`  [dry-run] would create ${spec.email} via ${coachCodeForAlpha || "—"}`);
    return null;
  }

  const user = await createUser(payload);
  console.log(`  [created] ${user.name} · ${user.email} · code ${user.referralCode} · via ${user.referredByCode || "—"}`);
  return user;
}

async function run() {
  const dryRun = hasFlag("--dry-run");
  console.log(dryRun ? "=== DRY RUN: REFERRAL PEER DEMO ===" : "=== SEED REFERRAL PEER DEMO ===\n");

  const coach = await pickCoach();
  if (!coach) {
    throw new Error("No wellness coach found. Create staff first (seed:staff-accounts).");
  }

  const coachReferralCode = await resolveCoachReferralCode(coach);
  console.log(`Coach: ${coach.name} <${coach.email}>`);
  console.log(`Coach referral code: ${coachReferralCode}\n`);

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const alphaSpec = { ...DEMO_USERS[0], _coachReferralCode: coachReferralCode };

  const alpha = await ensureDemoUser(alphaSpec, "coach", { dryRun, passwordHash });
  const beta = await ensureDemoUser(DEMO_USERS[1], "DEMO-PEER-A1", { dryRun, passwordHash });
  const carol = await ensureDemoUser(DEMO_USERS[2], "DEMO-PEER-B2", { dryRun, passwordHash });

  console.log("\n--- How to view in Admin ---");
  console.log("1. Referral Tree → Staff codes → open coach tree (search coach code):");
  console.log(`   ${coachReferralCode}`);
  console.log("2. Under the coach you should see Demo Alpha (via coach code).");
  console.log("3. Expand Alpha → Demo Beta (via DEMO-PEER-A1).");
  console.log("4. Expand Beta → Demo Carol (via DEMO-PEER-B2).");
  console.log("\nPeer-only tree: Referral Tree → Peer referrers → Demo Alpha → Open tree.");
  console.log(`\nDemo login password (if needed): ${DEFAULT_PASSWORD}`);
  console.log("Emails:");
  for (const row of DEMO_USERS) {
    console.log(`  - ${row.email}`);
  }

  if (!dryRun && alpha && beta && carol) {
    console.log("\nCodes:");
    console.log(`  Alpha: ${alpha.referralCode}`);
    console.log(`  Beta:  ${beta.referralCode}`);
    console.log(`  Carol: ${carol.referralCode}`);
  }
}

run().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exitCode = 1;
});

/**
 * Seed demo wellness coaches, assistant wellness coaches, and users.
 * Idempotent by email — existing rows are left alone (password not overwritten).
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedDemoAccounts.js
 *
 * Default password for all seeded accounts: Welcome@1
 */
require("dotenv").config();

const { hashPassword } = require("../utils/password");
const {
  createWellnessCoach,
  getWellnessCoachByEmail,
} = require("../models/wellnessCoachModel");
const {
  createAssistantWellnessCoach,
  getAssistantByEmail,
} = require("../models/assistantWellnessCoachModel");
const {
  createUser,
  getUserByEmail,
} = require("../models/userModel");
const {
  listSpecializations,
  getSpecializationByTitleKey,
  createSpecialization,
  buildTitleKey,
} = require("../models/specializationModel");

const DEFAULT_PASSWORD = "Welcome@1";

const COACHES = [
  {
    name: "Demo Coach One",
    email: "coach1@wellness.demo",
    phone: "9000000001",
    phoneCountryCode: "+91",
    bio: "Seeded wellness coach focused on general lifestyle coaching.",
    country: "India",
    state: "Maharashtra",
    city: "Mumbai",
    status: "active",
    approvalStatus: "approved",
  },
  {
    name: "Demo Coach Two",
    email: "coach2@wellness.demo",
    phone: "9000000002",
    phoneCountryCode: "+91",
    bio: "Seeded wellness coach focused on nutrition and metabolism.",
    country: "India",
    state: "Karnataka",
    city: "Bengaluru",
    status: "active",
    approvalStatus: "approved",
  },
];

/** Assistants are linked after coaches exist (wellnessCoachEmail). */
const ASSISTANTS = [
  {
    name: "Demo Assistant One",
    email: "assistant1@wellness.demo",
    phone: "9000000011",
    phoneCountryCode: "+91",
    designation: "Junior Wellness Assistant",
    wellnessCoachEmail: "coach1@wellness.demo",
    status: "active",
  },
  {
    name: "Demo Assistant Two",
    email: "assistant2@wellness.demo",
    phone: "9000000012",
    phoneCountryCode: "+91",
    designation: "Client Care Assistant",
    wellnessCoachEmail: "coach2@wellness.demo",
    status: "active",
  },
];

/**
 * Users — assigneeEmail + assigneeType resolve after coaches/assistants exist.
 * assigneeType: wellness_coach | assistant_wellness_coach | null (unassigned seek)
 */
const USERS = [
  {
    name: "Demo User Seek",
    email: "user.seek@wellness.demo",
    phone: "9000000101",
    phoneCountryCode: "+91",
    gender: "female",
    dob: "1992-05-12",
    userTier: "seek",
    status: "active",
    termsAccepted: true,
    assigneeEmail: null,
    assigneeType: null,
  },
  {
    name: "Demo User Coach Client",
    email: "user.coach@wellness.demo",
    phone: "9000000102",
    phoneCountryCode: "+91",
    gender: "male",
    dob: "1988-08-20",
    userTier: "heal",
    status: "active",
    termsAccepted: true,
    assigneeEmail: "coach1@wellness.demo",
    assigneeType: "wellness_coach",
  },
  {
    name: "Demo User Assistant Client",
    email: "user.assistant@wellness.demo",
    phone: "9000000103",
    phoneCountryCode: "+91",
    gender: "female",
    dob: "1995-01-08",
    userTier: "heal",
    status: "active",
    termsAccepted: true,
    assigneeEmail: "assistant1@wellness.demo",
    assigneeType: "assistant_wellness_coach",
  },
  {
    name: "Demo User Coach Two Client",
    email: "user.coach2@wellness.demo",
    phone: "9000000104",
    phoneCountryCode: "+91",
    gender: "male",
    dob: "1990-11-03",
    userTier: "consultancy_only",
    status: "active",
    termsAccepted: true,
    assigneeEmail: "coach2@wellness.demo",
    assigneeType: "wellness_coach",
  },
  {
    name: "Demo User Pending",
    email: "user.pending@wellness.demo",
    phone: "9000000105",
    phoneCountryCode: "+91",
    gender: "female",
    dob: "1993-03-15",
    userTier: "heal",
    status: "active",
    termsAccepted: true,
    assigneeEmail: null,
    assigneeType: null,
    assignmentStatus: "pending_admin",
  },
];

async function ensureSpecializationId() {
  const listed = await listSpecializations({ page: 1, limit: 50, status: "active" });
  const rows = listed?.specializations || [];
  if (rows.length > 0) return rows[0].id || rows[0]._id;

  const title = "General Wellness";
  const existing = await getSpecializationByTitleKey(buildTitleKey(title));
  if (existing) return existing.id || existing._id;

  const created = await createSpecialization({
    title,
    description: "Seeded default specialization for demo coaches.",
    status: "active",
  });
  return created.id || created._id;
}

async function upsertCoach(spec, passwordHash, specializationId) {
  const existing = await getWellnessCoachByEmail(spec.email);
  if (existing) {
    console.log(`  skip coach  ${spec.email} (exists)`);
    return existing;
  }
  const created = await createWellnessCoach({
    ...spec,
    password: passwordHash,
    specializationId,
    webVisible: true,
    appVisible: true,
  });
  console.log(`  create coach ${spec.email}`);
  return created;
}

async function upsertAssistant(spec, passwordHash, wellnessCoachId) {
  const existing = await getAssistantByEmail(spec.email);
  if (existing) {
    console.log(`  skip assistant ${spec.email} (exists)`);
    return existing;
  }
  const created = await createAssistantWellnessCoach({
    name: spec.name,
    email: spec.email,
    phone: spec.phone,
    phoneCountryCode: spec.phoneCountryCode,
    designation: spec.designation,
    status: spec.status,
    password: passwordHash,
    wellnessCoachId,
    webVisible: true,
    appVisible: true,
  });
  console.log(`  create assistant ${spec.email}`);
  return created;
}

async function upsertUser(spec, passwordHash, assigneeByEmail) {
  const existing = await getUserByEmail(spec.email);
  if (existing) {
    console.log(`  skip user   ${spec.email} (exists)`);
    return existing;
  }

  const now = new Date().toISOString();
  const fields = {
    name: spec.name,
    email: spec.email,
    phone: spec.phone,
    phoneCountryCode: spec.phoneCountryCode,
    gender: spec.gender,
    dob: spec.dob,
    userTier: spec.userTier,
    status: spec.status,
    termsAccepted: true,
    termsAcceptedAt: now,
    passwordHash,
    whatsappSameAsMobile: true,
    country: "India",
    city: "Mumbai",
  };

  if (spec.assignmentStatus === "pending_admin") {
    fields.assignmentStatus = "pending_admin";
    fields.healPaidAt = now;
  } else if (spec.assigneeEmail && spec.assigneeType) {
    const assignee = assigneeByEmail.get(String(spec.assigneeEmail).toLowerCase());
    if (!assignee) {
      throw new Error(`Assignee not found for ${spec.email}: ${spec.assigneeEmail}`);
    }
    fields.assignedCoachId = assignee.id;
    fields.assignedCoachType = spec.assigneeType;
    fields.parentCoachId =
      spec.assigneeType === "assistant_wellness_coach"
        ? assignee.wellnessCoachId || assignee.parentCoachId
        : assignee.id;
    fields.assignmentStatus = "assigned";
    fields.assignmentSource = "admin_manual";
    fields.assignedAt = now;
    if (spec.userTier === "heal" || spec.userTier === "consultancy_only") {
      fields.healPaidAt = now;
      fields.paidOnboardingCompleted = true;
      fields.paidOnboardingStep = "complete";
    }
  }

  const created = await createUser(fields);
  console.log(`  create user  ${spec.email}`);
  return created;
}

async function main() {
  console.log("Seeding demo accounts…");
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const specializationId = await ensureSpecializationId();
  console.log(`Specialization: ${specializationId}`);

  const assigneeByEmail = new Map();

  console.log("\nWellness coaches");
  for (const spec of COACHES) {
    const coach = await upsertCoach(spec, passwordHash, specializationId);
    const id = coach.id || coach._id;
    assigneeByEmail.set(String(spec.email).toLowerCase(), {
      id,
      wellnessCoachId: id,
    });
  }

  console.log("\nAssistant wellness coaches");
  for (const spec of ASSISTANTS) {
    const parent = assigneeByEmail.get(String(spec.wellnessCoachEmail).toLowerCase());
    if (!parent?.id) throw new Error(`Parent coach missing for ${spec.email}`);
    const assistant = await upsertAssistant(spec, passwordHash, parent.id);
    const id = assistant.id || assistant._id;
    assigneeByEmail.set(String(spec.email).toLowerCase(), {
      id,
      wellnessCoachId: assistant.wellnessCoachId || parent.id,
    });
  }

  console.log("\nUsers");
  for (const spec of USERS) {
    await upsertUser(spec, passwordHash, assigneeByEmail);
  }

  console.log("\nDone. Login password for seeded coaches/assistants/users:");
  console.log(`  ${DEFAULT_PASSWORD}`);
  console.log("\nAccounts:");
  for (const c of COACHES) console.log(`  coach     ${c.email}`);
  for (const a of ASSISTANTS) console.log(`  assistant ${a.email}`);
  for (const u of USERS) console.log(`  user      ${u.email}`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exit(1);
});

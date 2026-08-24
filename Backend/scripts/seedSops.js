/**
 * Seed genuine Standard Operating Procedures into DynamoDB.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedSops.js --confirm
 *   node --use-system-ca scripts/seedSops.js --confirm --dry-run
 *   node --use-system-ca scripts/seedSops.js --confirm --replace
 */
require("dotenv").config();

const { ScanCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { createSop, updateSop, TABLE } = require("../models/sopModel");
const {
  resolveAudienceRoleForStorage,
  loadConsoleRolesIndex,
  normalizeAudienceRoleInput,
} = require("../utils/sopAudienceRole");
const { ROLE_KEY_META } = require("../config/consolePermissionCatalog");

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const SEED_SOPS = [
  {
    title: "First-week client welcome call",
    category: "onboarding",
    audienceRole: "wellness_coach",
    contentType: "text",
    author: "Admin desk",
    steps: [
      "Review the client intake form and health goals before the call.",
      "Confirm program start date, check-in cadence, and preferred contact channel.",
      "Walk through the app: daily check-in, food diary, and how to message their coach.",
      "Set one realistic habit for week one and log it in the CRM note.",
      "Schedule the first formal review within 7–10 days.",
    ],
  },
  {
    title: "Handling a missed check-in (3 days)",
    category: "escalation",
    audienceRole: "wellness_coach",
    contentType: "text",
    author: "Admin desk",
    steps: [
      "Send a warm WhatsApp or in-app message — ask if everything is okay.",
      "If no reply in 24 hours, place a short phone call during business hours.",
      "Document the attempt in the client timeline with date and outcome.",
      "If still no contact after 48 hours, flag the account for Admin review.",
      "Do not pause billing or change program without Admin approval.",
    ],
  },
  {
    title: "Reviewing a weekly food diary",
    category: "nutrition",
    audienceRole: "wellness_coach",
    contentType: "text",
    author: "Admin desk",
    steps: [
      "Open the client's food diary for the past 7 days before the session.",
      "Note protein, hydration, and meal timing patterns — not individual 'cheat' meals.",
      "Pick one improvement and one win to discuss on the call.",
      "Update the plan in the portal if macros or meal timing need adjustment.",
      "Send a short summary message within 2 hours of the review.",
    ],
  },
  {
    title: "Requesting a Google review (happy client)",
    category: "reviews",
    audienceRole: "assistant_wellness_coach",
    contentType: "text",
    author: "Admin desk",
    steps: [
      "Only ask after a clear milestone: 4+ weeks adherence or visible progress.",
      "Ask permission on a live call — never cold-message a review link.",
      "Send the official Google review link from the shared Support templates.",
      "Log the request date in the client note so we don't ask twice in 90 days.",
      "Thank the client regardless of whether they leave a review.",
    ],
  },
  {
    title: "Payment failure follow-up",
    category: "payments",
    audienceRole: "support",
    contentType: "text",
    author: "Admin desk",
    steps: [
      "Check Razorpay / billing dashboard for failure reason within 4 business hours.",
      "Email the client with a secure payment link — no card details over chat.",
      "If unpaid after 48 hours, notify the assigned coach and pause new content uploads.",
      "After 7 days unpaid, escalate to Admin for program hold or closure.",
      "Record every touchpoint in the billing notes field.",
    ],
  },
  {
    title: "Shadowing a live coaching session",
    category: "onboarding",
    audienceRole: "trainee",
    contentType: "text",
    author: "Admin desk",
    steps: [
      "Join 5 minutes early with camera on and notebook ready.",
      "Observe only — do not interrupt unless the lead coach invites you.",
      "Note: rapport building, goal framing, and how objections are handled.",
      "Complete the trainee reflection form within 24 hours.",
      "Book a 15-minute debrief with your mentor coach the same week.",
    ],
  },
  {
    title: "Publishing or updating an SOP",
    category: "onboarding",
    audienceRole: "admin",
    contentType: "text",
    author: "Admin desk",
    steps: [
      "Open Admin → SOP and confirm you are in Admin view (not View-as Coach).",
      "Choose category, content type, and the staff role this procedure is for.",
      "Use clear step-by-step text; one action per line for text SOPs.",
      "Preview as Wellness Coach via View-as to confirm the right audience sees it.",
      "Announce major procedure changes in the weekly team huddle.",
    ],
  },
  {
    title: "Monthly progress review checklist",
    category: "reviews",
    audienceRole: "all",
    contentType: "text",
    author: "Admin desk",
    steps: [
      "Compare start vs current weight, measurements, and progress photos (with consent).",
      "Review adherence scores: check-ins, workouts logged, and diary completeness.",
      "Celebrate one non-scale win (energy, sleep, consistency).",
      "Agree on one focus for the next 30 days and document it in the client plan.",
      "Confirm next review date before ending the call.",
    ],
  },
  {
    title: "Escalating a medical red flag",
    category: "escalation",
    audienceRole: "all",
    contentType: "text",
    author: "Admin desk",
    steps: [
      "Do not diagnose or adjust medication — refer to their doctor immediately.",
      "Document exactly what the client reported, verbatim where possible.",
      "Notify Admin and the clinical lead within 1 hour during business hours.",
      "Pause intense training recommendations until medical clearance is confirmed.",
      "Follow up in 48 hours to confirm the client has seen a healthcare provider.",
    ],
  },
  {
    title: "Assistant coach: preparing the weekly team digest",
    category: "onboarding",
    audienceRole: "assistant_wellness_coach",
    contentType: "text",
    author: "Admin desk",
    steps: [
      "Export missed check-ins and overdue reviews from the dashboard each Monday 9 AM.",
      "Group clients by assigned wellness coach — max one digest email per coach.",
      "Highlight only items needing action this week; skip stable clients.",
      "Send the digest before noon and cc Admin on the first month of a new AWC hire.",
      "Archive the sent list in the shared team drive for audit.",
    ],
  },
];

async function buildSeedRows() {
  const rows = [...SEED_SOPS];
  const { roles } = await loadConsoleRolesIndex();
  const customRoles = roles.filter((role) => {
    const key = String(role.roleKey || "").toLowerCase();
    return !key || !ROLE_KEY_META[key];
  });

  for (const role of customRoles.slice(0, 2)) {
    rows.push({
      title: `Using the console as ${role.name}`,
      category: "onboarding",
      audienceRole: role.id,
      contentType: "text",
      author: "Admin desk",
      steps: [
        `Sign in with your ${role.name} account and confirm the correct role is active.`,
        "Review the sections available in your sidebar — custom roles may differ from Wellness Coach.",
        "Follow data-scope rules: only open clients and records your role is permitted to see.",
        "If a required section is missing, ask Admin to update the role in Access Control.",
        "Report workflow gaps to Admin so this SOP can be updated.",
      ],
    });
  }

  const resolved = [];
  for (const row of rows) {
    const audienceRole = await resolveAudienceRoleForStorage(row.audienceRole, { fallback: "all" });
    resolved.push({ ...row, audienceRole });
  }
  return resolved;
}

async function migrateLegacyAudienceRoles(existing) {
  const { byAccountRoleKey } = await loadConsoleRolesIndex();
  let updated = 0;
  for (const item of existing) {
    const raw = normalizeAudienceRoleInput(item.audienceRole);
    if (!raw || raw === "all") continue;
    const mapped = byAccountRoleKey[raw];
    if (!mapped || mapped === raw) continue;
    await updateSop(item.id, { audienceRole: mapped });
    console.log(`  migrated audience: ${item.title}`);
    updated += 1;
  }
  return updated;
}

async function listExistingSops() {
  const items = [];
  let lastKey;
  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function clearSops(items) {
  for (const item of items) {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { id: item.id },
      })
    );
    console.log(`  removed: ${item.title}`);
  }
}

async function main() {
  const confirm = hasFlag("--confirm");
  const dryRun = hasFlag("--dry-run");
  const replace = hasFlag("--replace");
  const migrate = hasFlag("--migrate-audience");

  if (!confirm) {
    console.error(
      "Usage: node --use-system-ca scripts/seedSops.js --confirm [--dry-run] [--replace] [--migrate-audience]"
    );
    process.exitCode = 1;
    return;
  }

  const existing = await listExistingSops();
  console.log(`Found ${existing.length} existing SOP(s).`);

  if (migrate && existing.length) {
    const count = await migrateLegacyAudienceRoles(existing);
    console.log(`Migrated ${count} SOP(s) to console role ids.`);
  }

  const seedRows = await buildSeedRows();
  const existingTitles = new Set(
    existing.map((row) => String(row.title || "").trim().toLowerCase())
  );
  const toCreate = replace
    ? seedRows
    : seedRows.filter((row) => !existingTitles.has(row.title.trim().toLowerCase()));

  if (!toCreate.length && !replace) {
    console.log("All seed SOPs already exist. Nothing to add.");
    return;
  }

  if (dryRun) {
    if (replace && existing.length) {
      console.log(`\n[dry-run] Would remove ${existing.length} existing SOP(s).`);
    }
    console.log(`\n[dry-run] Would create ${toCreate.length} SOP(s):`);
    toCreate.forEach((row) => {
      console.log(`  - [${row.audienceRole}] ${row.category}: ${row.title}`);
    });
    return;
  }

  if (replace && existing.length) {
    console.log("\nClearing existing SOPs…");
    await clearSops(existing);
  }

  console.log(`\nSeeding ${toCreate.length} SOP(s)…`);
  for (const row of toCreate) {
    const sop = await createSop(row);
    console.log(`  + ${sop.title} (${sop.audienceRole})`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

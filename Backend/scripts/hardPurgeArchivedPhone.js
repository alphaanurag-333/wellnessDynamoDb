/**
 * Permanently remove archived User + staff Account rows (and related identity mirrors)
 * for a phone number. Does not touch unrelated tables except ReferralCode + legacy coach rows.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/hardPurgeArchivedPhone.js --phone=9981110114 --country=+91 --confirm
 */
require("dotenv").config();

const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { scanTable, tableExists } = require("../migration/lib/helpers");
const { deleteReferralCodeRecord } = require("../models/referralCodeModel");

function parseArgs() {
  const confirm = process.argv.includes("--confirm");
  let phone = "";
  let country = "+91";
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--phone=")) phone = arg.slice(8).replace(/\s/g, "");
    if (arg.startsWith("--country=")) country = arg.slice(10).trim();
  }
  return { confirm, phone, country };
}

function phoneDigits(phone, country) {
  const cc = String(country || "+91").replace(/\D/g, "");
  const num = String(phone || "").replace(/\D/g, "");
  return { cc, num, full: `${cc}${num}` };
}

function rowMatchesPhone(item, { cc, num, full }) {
  const fields = [
    item.phone,
    item.whatsappPhone,
    item.phoneKey,
    item.deletedPhoneKey,
    item.whatsappKey,
    item.deletedWhatsappKey,
  ];
  return fields.some((f) => {
    const d = String(f || "").replace(/\D/g, "");
    return d === full || d.endsWith(num) || d.includes(num);
  });
}

async function hardDeleteKey(tableName, id) {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { id },
      })
    );
    return true;
  } catch (err) {
    console.error(`  [${tableName}] delete ${id} failed:`, err?.message || err);
    return false;
  }
}

async function purgeReferralCodesForEntity(entityId) {
  if (!(await tableExists("ReferralCode"))) return 0;
  const rows = await scanTable("ReferralCode");
  let n = 0;
  for (const row of rows) {
    if (String(row.entityId || "") !== String(entityId)) continue;
    if (!row.referralCode) continue;
    try {
      await deleteReferralCodeRecord(row.referralCode);
      n += 1;
      console.log(`  [ReferralCode] removed ${row.referralCode} for entity ${entityId}`);
    } catch (err) {
      console.error(`  [ReferralCode] ${row.referralCode}:`, err?.message || err);
    }
  }
  return n;
}

async function purgeUserChildRows(userId) {
  const tables = [
    "UserBodyMeasurement",
    "UserProgressPhoto",
    "UserMedicalCondition",
    "MealTracking",
    "WaterTracking",
    "StepsTracking",
    "DailyReflection",
    "UserLaunchAssessment",
    "UserPrakrutiAssessment",
    "UserLabReport",
    "UserNotificationRead",
    "UserCommitmentLetter",
    "ConsultancyTransaction",
    "EnergyExchangeSubscription",
    "CoachAssignedDietPlan",
    "CoachRecommendedTest",
    "CoachAssignedWellnessPrescription",
    "CoachRecommendedSupplement",
    "UserSupplementDosage",
    "UserSupplementDosageLog",
    "HealthProgressWeight",
    "HealthProgressGlucose",
    "HealthProgressBloodPressure",
    "HealthProgressMenstrualCycle",
    "HealthProgressCondition",
    "HealthProgressMetabolicMetric",
    "Reminder",
  ];
  let total = 0;
  for (const tableName of tables) {
    if (!(await tableExists(tableName))) continue;
    const items = await scanTable(tableName);
    const hits = items.filter((item) => String(item.userId || "") === String(userId));
    for (const item of hits) {
      const key = item.id != null ? { id: item.id } : null;
      if (!key) continue;
      try {
        await docClient.send(new DeleteCommand({ TableName: tableName, Key: key }));
        total += 1;
      } catch (err) {
        console.error(`  [${tableName}] child delete failed:`, err?.message || err);
      }
    }
    if (hits.length) console.log(`  [${tableName}] removed ${hits.length} row(s) for user ${userId}`);
  }
  return total;
}

async function main() {
  const { confirm, phone, country } = parseArgs();
  const digits = phoneDigits(phone, country);
  if (!digits.num) {
    console.error("Usage: --phone=9981110114 --country=+91 --confirm");
    process.exit(1);
  }
  if (!confirm) {
    console.error("Refusing to run without --confirm");
    process.exit(1);
  }

  const userHits = (await tableExists("User")) ? (await scanTable("User")).filter((r) => rowMatchesPhone(r, digits)) : [];
  const accountHits = (await tableExists("Account")) ? (await scanTable("Account")).filter((r) => rowMatchesPhone(r, digits)) : [];

  console.log(`Phone target: ${country} ${phone} (${digits.full})`);
  console.log(`Users to purge: ${userHits.length}`);
  userHits.forEach((u) => console.log(`  - User ${u.id} (${u.name}) status=${u.status}`));
  console.log(`Accounts to purge: ${accountHits.length}`);
  accountHits.forEach((a) => console.log(`  - Account ${a.id} (${a.name}) status=${a.status}`));

  for (const user of userHits) {
    console.log(`\nPurging client ${user.id}...`);
    const childCount = await purgeUserChildRows(user.id);
    console.log(`  Child rows removed: ${childCount}`);
    await purgeReferralCodesForEntity(user.id);
    const ok = await hardDeleteKey("User", user.id);
    console.log(ok ? `  [User] hard-deleted ${user.id}` : `  [User] failed ${user.id}`);
  }

  for (const account of accountHits) {
    console.log(`\nPurging staff account ${account.id}...`);
    await purgeReferralCodesForEntity(account.id);
    for (const tableName of ["WellnessCoach", "AssistantWellnessCoach", "Admin"]) {
      if (!(await tableExists(tableName))) continue;
      const ok = await hardDeleteKey(tableName, account.id);
      if (ok) console.log(`  [${tableName}] hard-deleted ${account.id}`);
    }
    const ok = await hardDeleteKey("Account", account.id);
    console.log(ok ? `  [Account] hard-deleted ${account.id}` : `  [Account] failed ${account.id}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

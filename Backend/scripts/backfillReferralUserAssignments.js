/**
 * Associate existing users with the WC/AWC represented by their referral code.
 *
 * Only users that have referral history but are not already assigned are updated.
 * Existing assignments are never overwritten.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/backfillReferralUserAssignments.js --dry-run
 *   node --use-system-ca scripts/backfillReferralUserAssignments.js
 */
require("dotenv").config();

const { scanTable, tableExists } = require("../migration/lib/helpers");
const { getReferralCodeRecord } = require("../models/referralCodeModel");
const { updateUser } = require("../models/userModel");
const { loadReferralContext } = require("../models/userConversionModel");
const { resolveConversionAssignment } = require("../models/userAssignmentLogic");

const DRY_RUN = process.argv.includes("--dry-run");

function isAlreadyAssigned(user) {
  return (
    String(user?.assignmentStatus || "").toLowerCase() === "assigned" &&
    Boolean(String(user?.assignedCoachId || "").trim()) &&
    Boolean(String(user?.parentCoachId || "").trim())
  );
}

async function run() {
  if (!(await tableExists("User"))) {
    throw new Error("User table does not exist");
  }

  const users = await scanTable("User");
  let eligible = 0;
  let updated = 0;
  let skipped = 0;

  console.log(
    DRY_RUN
      ? "Backfill referral user assignments (dry run)"
      : "Backfill referral user assignments"
  );

  for (const user of users) {
    const referralCode = String(user?.referredByCode || "").trim().toUpperCase();
    if (!referralCode || isAlreadyAssigned(user)) continue;
    eligible += 1;

    const referralRecord = await getReferralCodeRecord(referralCode);
    if (!referralRecord) {
      console.log(`  ! ${user.name || user.id} — referral code ${referralCode} is not registered`);
      skipped += 1;
      continue;
    }

    try {
      const context = await loadReferralContext(referralRecord);
      const assignment = resolveConversionAssignment(
        referralRecord,
        context,
        referralCode
      );
      if (assignment.assignmentStatus !== "assigned") {
        skipped += 1;
        continue;
      }

      if (DRY_RUN) {
        console.log(
          `  + ${user.name || user.id} → ${assignment.assignedCoachType}:${assignment.assignedCoachId}`
        );
      } else {
        await updateUser(user.id, {
          assignedCoachId: assignment.assignedCoachId,
          assignedCoachType: assignment.assignedCoachType,
          parentCoachId: assignment.parentCoachId,
          assignmentStatus: "assigned",
          assignmentSource: "referral",
          assignedAt: new Date().toISOString(),
        });
        console.log(
          `  ✓ ${user.name || user.id} → ${assignment.assignedCoachType}:${assignment.assignedCoachId}`
        );
      }
      updated += 1;
    } catch (err) {
      console.log(`  ! ${user.name || user.id} — ${err.message}`);
      skipped += 1;
    }
  }

  console.log(
    `\nUsers scanned: ${users.length} · eligible: ${eligible} · ${DRY_RUN ? "would update" : "updated"}: ${updated} · skipped: ${skipped}`
  );
  if (DRY_RUN) console.log("Dry run — nothing was written.");
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exitCode = 1;
});

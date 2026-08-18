/**
 * Wipe MentalWellbeing, WellnessYoga, PhysicalExercise (and assignments)
 * then seed genuine YouTube library items with thumbnails and duration.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedWellnessLibraries.js --confirm
 *   node --use-system-ca scripts/seedWellnessLibraries.js --confirm --dry-run
 */
require("dotenv").config();

const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { scanTable } = require("../migration/lib/helpers");
const { uploadBufferToS3, deleteStoredMedia } = require("../utils/s3");
const { resolveDuration } = require("../utils/wellnessLibraryFields");
const { createMentalWellbeing } = require("../models/mentalWellbeingModel");
const { createWellnessYoga } = require("../models/wellnessYogaModel");
const { createPhysicalExercise } = require("../models/physicalExerciseModel");

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function yt(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

const MENTAL = [
  {
    title: "5-minute meditation you can do anywhere",
    videoId: "inpok4MKVLM",
    duration: "5:00",
    status: "active",
  },
  {
    title: "10-minute meditation for anxiety",
    videoId: "O-6f5wQXSu8",
    duration: "10:00",
    status: "active",
  },
  {
    title: "Box breathing to settle the nervous system",
    videoId: "tEmt1Znux58",
    duration: "5:12",
    status: "active",
  },
  {
    title: "4-7-8 breathing for calm",
    videoId: "gz4G31LGyog",
    duration: "8:00",
    status: "active",
  },
  {
    title: "Sleep meditation for stress relief",
    videoId: "aEqlQvczMJQ",
    duration: "10:00",
    status: "active",
  },
  {
    title: "Evening gratitude practice",
    videoId: "WPPPFqsECz0",
    duration: "6:00",
    status: "inactive",
  },
];

const YOGA = [
  {
    title: "Yoga for complete beginners",
    videoId: "v7AYKMP6rOE",
    duration: "20:00",
    status: "active",
  },
  {
    title: "Morning sun salutation flow",
    videoId: "_ENYL8qxKx0",
    duration: "15:00",
    status: "active",
  },
  {
    title: "Yoga for neck and shoulder relief",
    videoId: "SedzswEwpPw",
    duration: "12:00",
    status: "active",
  },
  {
    title: "Restorative yin for hips and spine",
    videoId: "nylNjxeOeSw",
    duration: "20:00",
    status: "active",
  },
  {
    title: "Pranayama potion (20 min)",
    videoId: "4uNdlGcySLQ",
    duration: "20:00",
    status: "active",
  },
  {
    title: "10-minute bedtime yoga",
    videoId: "CLDHeV9OI5U",
    duration: "10:00",
    status: "inactive",
  },
];

const EXERCISE = [
  {
    title: "Full-body beginner workout (no equipment)",
    description: "A 20-minute follow-along routine for coaching clients starting movement after a long break.",
    videoId: "UItWltVZZmE",
    duration: "20:00",
    status: "active",
  },
  {
    title: "Morning mobility and stretch",
    description: "Joint-friendly mobility to loosen hips, spine and shoulders before the day.",
    videoId: "g_tea8ZNk5A",
    duration: "15:00",
    status: "active",
  },
  {
    title: "Low-impact HIIT for fat loss",
    description: "Cardio without jumping. Suitable for knee-sensitive and beginner clients.",
    videoId: "50kH47ZztHs",
    duration: "18:00",
    status: "active",
  },
  {
    title: "Core strength and stability",
    description: "A short core session to build trunk control for daily movement and posture.",
    videoId: "2pLT-olgUJs",
    duration: "10:00",
    status: "active",
  },
  {
    title: "10-minute walking workout",
    description: "Indoor walking intervals for clients who cannot yet do floor or high-impact work.",
    videoId: "ml6cT4AZdqI",
    duration: "10:00",
    status: "active",
  },
  {
    title: "Posture correction for desk days",
    description: "Upper-back and shoulder drills to undo rounded posture from sitting.",
    videoId: "RqcOCBb4arc",
    duration: "12:00",
    status: "inactive",
  },
];

const TABLES = [
  "AssignedMentalWellbeing",
  "AssignedWellnessYoga",
  "AssignedPhysicalExercise",
  "MentalWellbeing",
  "WellnessYoga",
  "PhysicalExercise",
];

async function downloadYoutubeThumb(videoId) {
  const urls = [
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  ];
  let lastError;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastError = new Error(`${res.status} ${url}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 2000) return buffer;
      lastError = new Error(`tiny thumbnail from ${url}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error(`Could not download thumbnail for ${videoId}`);
}

async function uploadThumb(videoId, folder) {
  const buffer = await downloadYoutubeThumb(videoId);
  return uploadBufferToS3({
    buffer,
    contentType: "image/jpeg",
    folder,
    originalName: `${videoId}.jpg`,
  });
}

async function durationFor(row) {
  const ytLink = yt(row.videoId);
  const detected = await resolveDuration({ duration: "", ytLink });
  return detected || row.duration || "";
}

async function clearTable(tableName) {
  const items = await scanTable(tableName);
  console.log(`  [${tableName}] found ${items.length} row(s)`);
  const clearMedia = !tableName.startsWith("Assigned");
  for (const item of items) {
    if (clearMedia) {
      for (const field of ["thumbnail", "file", "video", "link"]) {
        const value = String(item[field] || "").trim();
        if (!value || /^https?:\/\/(www\.)?youtube\.com/i.test(value) || /^https?:\/\/youtu\.be/i.test(value)) continue;
        try {
          await deleteStoredMedia(value);
        } catch {
          /* ignore missing S3 objects */
        }
      }
    }
    if (!item.id) continue;
    await docClient.send(new DeleteCommand({ TableName: tableName, Key: { id: item.id } }));
  }
  console.log(`  [${tableName}] cleared`);
}

async function seedMental(dryRun) {
  console.log("\nSeeding MentalWellbeing...");
  for (const row of MENTAL) {
    if (dryRun) {
      console.log(`  - ${row.title}`);
      continue;
    }
    const ytLink = yt(row.videoId);
    const thumbnail = await uploadThumb(row.videoId, "mental-wellbeing");
    const duration = await durationFor(row);
    const item = await createMentalWellbeing({
      title: row.title,
      type: "ytlink",
      ytLink,
      file: "",
      thumbnail,
      duration,
      status: row.status,
    });
    console.log(`  ✓ ${item.title} · ${duration || "no time"} (${row.status})`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

async function seedYoga(dryRun) {
  console.log("\nSeeding WellnessYoga...");
  for (const row of YOGA) {
    if (dryRun) {
      console.log(`  - ${row.title}`);
      continue;
    }
    const ytLink = yt(row.videoId);
    const thumbnail = await uploadThumb(row.videoId, "wellness-yoga");
    const duration = await durationFor(row);
    const item = await createWellnessYoga({
      title: row.title,
      type: "ytlink",
      ytLink,
      file: "",
      thumbnail,
      duration,
      status: row.status,
    });
    console.log(`  ✓ ${item.title} · ${duration || "no time"} (${row.status})`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

async function seedExercise(dryRun) {
  console.log("\nSeeding PhysicalExercise...");
  for (const row of EXERCISE) {
    if (dryRun) {
      console.log(`  - ${row.title}`);
      continue;
    }
    const ytLink = yt(row.videoId);
    const thumbnail = await uploadThumb(row.videoId, "physical-exercise");
    const duration = await durationFor(row);
    const item = await createPhysicalExercise({
      title: row.title,
      description: row.description,
      type: "ytlink",
      ytLink,
      link: ytLink,
      thumbnail,
      duration,
      status: row.status,
    });
    console.log(`  ✓ ${item.title} · ${duration || "no time"} (${row.status})`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

async function main() {
  const confirm = hasFlag("--confirm");
  const dryRun = hasFlag("--dry-run");
  if (!confirm) {
    console.error("Refusing to wipe tables without --confirm");
    process.exitCode = 1;
    return;
  }

  console.log(dryRun ? "Dry run: no writes." : "Clearing wellness libraries and assignments...");
  if (!dryRun) {
    for (const table of TABLES) {
      await clearTable(table);
    }
  }

  await seedMental(dryRun);
  await seedYoga(dryRun);
  await seedExercise(dryRun);
  console.log(
    `\nDone. ${MENTAL.length} mental, ${YOGA.length} yoga, ${EXERCISE.length} exercise.`
  );
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exitCode = 1;
});

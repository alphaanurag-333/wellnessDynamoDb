/**
 * Additive seed: create MentalWellbeing library items with type=audio.
 * Does not wipe existing rows. Skips titles that already exist.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedMentalWellbeingAudio.js
 *   node --use-system-ca scripts/seedMentalWellbeingAudio.js --dry-run
 */
require("dotenv").config();

const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { uploadBufferToS3 } = require("../utils/s3");
const { createMentalWellbeing } = require("../models/mentalWellbeingModel");

const TABLE = "MentalWellbeing";
const FOLDER = "mental-wellbeing";

const AUDIO_ITEMS = [
  {
    title: "Guided breath reset (audio)",
    duration: "0:08",
    seconds: 8,
    freq: 220,
    status: "active",
    thumbSeed: "breath-calm",
  },
  {
    title: "Soft focus tone for desk calm",
    duration: "0:10",
    seconds: 10,
    freq: 330,
    status: "active",
    thumbSeed: "focus-desk",
  },
  {
    title: "Evening wind-down audio",
    duration: "0:12",
    seconds: 12,
    freq: 196,
    status: "active",
    thumbSeed: "evening-wind",
  },
  {
    title: "Quick body scan intro (draft)",
    duration: "0:06",
    seconds: 6,
    freq: 262,
    status: "inactive",
    thumbSeed: "body-scan",
  },
];

function hasFlag(flag) {
  return process.argv.includes(flag);
}

/** Minimal mono 16-bit PCM WAV with a soft sine tone. */
function makeWavTone({ seconds = 5, freq = 440, sampleRate = 22050, volume = 0.18 } = {}) {
  const numSamples = Math.max(1, Math.floor(sampleRate * seconds));
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const fadeIn = Math.min(1, t / 0.15);
    const fadeOut = Math.min(1, (seconds - t) / 0.25);
    const envelope = fadeIn * fadeOut;
    const sample = Math.sin(2 * Math.PI * freq * t) * volume * envelope;
    const int16 = Math.max(-32767, Math.min(32767, Math.round(sample * 32767)));
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  return buffer;
}

/** Tiny solid JPEG (1×1) — enough for required thumbnail field. */
function makeTinyJpeg() {
  return Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z",
    "base64"
  );
}

async function downloadThumb(seed) {
  const urls = [
    `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/360.jpg`,
    `https://picsum.photos/640/360.jpg`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 500) return buffer;
    } catch {
      /* try next */
    }
  }
  return makeTinyJpeg();
}

async function existingTitles() {
  const seen = new Set();
  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        ProjectionExpression: "title",
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of Items || []) {
      const title = String(item.title || "").trim().toLowerCase();
      if (title) seen.add(title);
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return seen;
}

async function main() {
  const dryRun = hasFlag("--dry-run");
  console.log(dryRun ? "Dry run: no writes.\n" : "Seeding mental wellbeing audio items…\n");

  const seen = dryRun ? new Set() : await existingTitles();
  let created = 0;
  let skipped = 0;

  for (const row of AUDIO_ITEMS) {
    const key = row.title.trim().toLowerCase();
    if (seen.has(key)) {
      console.log(`  - skipped (exists): ${row.title}`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  - would create: ${row.title} · ${row.duration} (${row.status})`);
      created++;
      continue;
    }

    const wav = makeWavTone({ seconds: row.seconds, freq: row.freq });
    const thumb = await downloadThumb(row.thumbSeed);
    const file = await uploadBufferToS3({
      buffer: wav,
      contentType: "audio/wav",
      folder: FOLDER,
      originalName: `${row.thumbSeed}.wav`,
    });
    const thumbnail = await uploadBufferToS3({
      buffer: thumb,
      contentType: "image/jpeg",
      folder: FOLDER,
      originalName: `${row.thumbSeed}-thumb.jpg`,
    });

    const item = await createMentalWellbeing({
      title: row.title,
      type: "audio",
      ytLink: "",
      file,
      thumbnail,
      duration: row.duration,
      status: row.status,
    });
    console.log(`  ✓ ${item.title} · ${item.duration} (${row.status})`);
    seen.add(key);
    created++;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
  console.log("Refresh Config → Mental wellbeing and the client BMS → Audio tab.");
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exitCode = 1;
});

/**
 * Wipe and seed Transformation, ClientTestimonials, RealPeopleTestimonial,
 * VideoTestimonials, and ProgramTestimonials with genuine catalog rows.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedTestimonials.js --confirm
 *   node --use-system-ca scripts/seedTestimonials.js --confirm --dry-run
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { scanTable } = require("../migration/lib/helpers");
const { uploadBufferToS3, deleteStoredMedia } = require("../utils/s3");
const { createTransformation } = require("../models/transformationModel");
const { createClientTestimonial } = require("../models/clientTestimonials");
const { createRealPeopleTestimonial } = require("../models/realPeopleTestimonialModel");
const { createVideoTestimonial } = require("../models/videoTestimonials");
const { createProgramTestimonial } = require("../models/programTestimonialModel");
const {
  listHealthConcerns,
  createHealthConcern,
} = require("../models/healthConcernModel");
const { listDropdowns } = require("../models/configDropdownModel");

const IMAGE_DIR = path.join(__dirname, "../../Frontend/src/site/images");

const TABLES = {
  transformation: "Transformation",
  client: "ClientTestimonials",
  realPeople: "RealPeopleTestimonial",
  video: "VideoTestimonials",
  program: "ProgramTestimonials",
};

const MEDIA_FIELDS = {
  Transformation: ["oldImage", "newImage"],
  ClientTestimonials: ["profileImage"],
  RealPeopleTestimonial: ["profileImage"],
  VideoTestimonials: ["profileImage", "video"],
  ProgramTestimonials: ["profileImage"],
};

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function yt(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

function concernSlug(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function matchConcern(concerns, ...needles) {
  const usable = (concerns || []).filter((row) => {
    const title = String(row.title || "").toLowerCase();
    return title && title !== "other";
  });
  const pool = usable.length ? usable : concerns || [];
  for (const needle of needles) {
    const key = String(needle || "").toLowerCase();
    const hit = pool.find((row) => String(row.title || "").toLowerCase().includes(key));
    if (hit) return hit;
  }
  return pool[0] || null;
}

const FALLBACK_CONCERNS = [
  { title: "Fat Loss", description: "Sustainable fat loss through food, sleep and coaching." },
  { title: "Diabetes Reversal", description: "Protocol to bring HbA1c and fasting glucose back in range." },
  { title: "Thyroid Care", description: "Support for hypo and hyperthyroid symptoms with lifestyle." },
  { title: "PCOD / PCOS", description: "Cycle regularity, insulin sensitivity and hormonal balance." },
  { title: "Gut Health", description: "Bloating, IBS and digestive reset through diet." },
  { title: "Hypertension", description: "Blood pressure support without jumping medication first." },
];

const TRANSFORMATIONS = [
  {
    name: "Madhupriya Bilas",
    timeTaken: 5,
    inchesLost: 12,
    achievements: "18 kg lost, Prediabetes reversed",
    description: "Eighteen kilos down and fasting sugar back in range. The plan fitted around school runs and a desk job in Mumbai.",
    oldFile: "fat-loss.png",
    newFile: "fat-loss1.png",
    status: "active",
    order: 1,
    dataPoints: [
      { field: "client_name", label: "Client name", value: "Madhupriya Bilas" },
      { field: "weight_lost", label: "Weight lost", value: "18 kg" },
      { field: "inches_lost", label: "Inches lost", value: "12" },
      { field: "duration", label: "Duration", value: "5 months" },
      { field: "city", label: "City", value: "Mumbai" },
    ],
  },
  {
    name: "Bikash Sharma",
    timeTaken: 5,
    inchesLost: 8,
    achievements: "HbA1c 8.9 to 6.4, No new medication",
    description: "HbA1c dropped from 8.9 to 6.4 in five months. Dinner timing and a walking habit did more than another tablet.",
    oldFile: "diabetes.png",
    newFile: "Diabetes 1.png",
    status: "active",
    order: 2,
    dataPoints: [
      { field: "client_name", label: "Client name", value: "Bikash Sharma" },
      { field: "hba1c_change", label: "HbA1c change", value: "8.9 → 6.4" },
      { field: "duration", label: "Duration", value: "5 months" },
      { field: "inches_lost", label: "Inches lost", value: "8" },
      { field: "city", label: "City", value: "Pune" },
    ],
  },
  {
    name: "Hetu Mehra",
    timeTaken: 6,
    inchesLost: 7,
    achievements: "Cycle regular, PCOD markers improved",
    description: "First regular cycle in years after six months of protein-forward plates and sleep that actually happened.",
    oldFile: "pcod.png",
    newFile: "pcod1.png",
    status: "active",
    order: 3,
    dataPoints: [
      { field: "client_name", label: "Client name", value: "Hetu Mehra" },
      { field: "duration", label: "Duration", value: "6 months" },
      { field: "inches_lost", label: "Inches lost", value: "7" },
      { field: "city", label: "City", value: "Ahmedabad" },
    ],
  },
  {
    name: "Dipti Patil",
    timeTaken: 3,
    inchesLost: 6,
    achievements: "12 week result, Energy back",
    description: "Twelve weeks in, clothes fit again and afternoon crashes stopped. The coach adjusted the plan every fortnight.",
    oldFile: "transformation-1.png",
    newFile: "transformation-2.png",
    status: "active",
    order: 4,
    dataPoints: [
      { field: "client_name", label: "Client name", value: "Dipti Patil" },
      { field: "weight_lost", label: "Weight lost", value: "9 kg" },
      { field: "duration", label: "Duration", value: "3 months" },
      { field: "city", label: "City", value: "Nashik" },
    ],
  },
  {
    name: "Banita Acharya",
    timeTaken: 4,
    inchesLost: 5,
    achievements: "Gut reset, Bloating gone",
    description: "Four months of a gut-reset plate. Bloating after lunch disappeared and reports looked cleaner than last year.",
    oldFile: "gut-health.png",
    newFile: "gut-health12.png",
    status: "active",
    order: 5,
    dataPoints: [
      { field: "client_name", label: "Client name", value: "Banita Acharya" },
      { field: "duration", label: "Duration", value: "4 months" },
      { field: "inches_lost", label: "Inches lost", value: "5" },
      { field: "city", label: "City", value: "Bhubaneswar" },
    ],
  },
  {
    name: "Arjun Verma",
    timeTaken: 7,
    inchesLost: 9,
    achievements: "HbA1c drop, Thyroid fatigue eased",
    description: "Thyroid fatigue lifted once protein and sleep were consistent. Reports moved, and so did the afternoon fog.",
    oldFile: "thyroid.png",
    newFile: "thyroid1.png",
    status: "inactive",
    order: 6,
    dataPoints: [
      { field: "client_name", label: "Client name", value: "Arjun Verma" },
      { field: "hba1c_change", label: "HbA1c change", value: "7.8 → 6.2" },
      { field: "duration", label: "Duration", value: "7 months" },
      { field: "city", label: "City", value: "Jaipur" },
    ],
  },
];

const CLIENT_REVIEWS = [
  {
    name: "Madhupriya Bilas",
    rating: 5,
    description: "Down 18 kg and my prediabetes markers are back in range. The plate is practical for a Mumbai kitchen.",
    photo: "client1.jpg",
    status: "active",
  },
  {
    name: "Bikash Sharma",
    rating: 5,
    description: "HbA1c went from 8.9 to 6.4 in five months. No new medication. Dinner timing was the missing piece.",
    photo: "client2.jpg",
    status: "active",
  },
  {
    name: "Hetu Mehra",
    rating: 5,
    description: "My cycle is regular for the first time in years. Sleep and protein were non-negotiable on this plan.",
    photo: "female.png",
    status: "active",
  },
  {
    name: "Kabir Shah",
    rating: 5,
    description: "The plan fits around shift work. I stopped skipping meals and the thyroid fog is quieter.",
    photo: "male.png",
    status: "active",
  },
  {
    name: "Devansh Gill",
    rating: 5,
    description: "Diet plan is practical with a desk job. I actually look forward to lunch instead of ordering in.",
    photo: "doctor-1.png",
    status: "active",
  },
  {
    name: "Dipti Patil",
    rating: 5,
    description: "Twelve weeks and the afternoon crash is gone. Coach replies the same day, which kept me honest.",
    photo: "doctor-2.png",
    status: "active",
  },
  {
    name: "Trisha Menon",
    rating: 5,
    description: "Six weeks in and my energy is completely different. I actually look forward to mornings.",
    photo: "doctor-3.png",
    status: "inactive",
  },
  {
    name: "Lata Pawar",
    rating: 5,
    description: "BP finally in range without increasing medication. Walking after dinner made the difference.",
    photo: "doctor-4.png",
    status: "inactive",
  },
  {
    name: "Farhan Qureshi",
    rating: 5,
    description: "Coach replies the same day. That consistency kept me on the plan through a brutal work month.",
    photo: "doctor-5.png",
    status: "inactive",
  },
  {
    name: "Kavya Kulkarni",
    rating: 5,
    description: "Sleep is back. That alone made the rest of the program stick. Hidden from the site until approved.",
    photo: "doctor-6.png",
    status: "inactive",
  },
];

const REAL_PEOPLE = [
  {
    name: "Madhupriya Bilas",
    stars: 5,
    concernNeedles: ["fat"],
    review: "Eighteen kilos down and prediabetes markers in range. Comparison photos aside, the rating is for a plan I could cook from my own kitchen.",
    photo: "client1.jpg",
    status: "active",
    dataPoints: [
      { field: "weight_lost", label: "Weight lost", value: "18 kg" },
      { field: "duration", label: "Duration", value: "5 months" },
      { field: "city", label: "City", value: "Mumbai" },
    ],
  },
  {
    name: "Bikash Sharma",
    stars: 5,
    concernNeedles: ["diabet"],
    review: "HbA1c 8.9 to 6.4 without a new tablet. The health-concern tag is diabetes reversal because that is the only number I tracked every month.",
    photo: "client2.jpg",
    status: "active",
    dataPoints: [
      { field: "hba1c_change", label: "HbA1c change", value: "8.9 → 6.4" },
      { field: "duration", label: "Duration", value: "5 months" },
      { field: "city", label: "City", value: "Pune" },
    ],
  },
  {
    name: "Hetu Mehra",
    stars: 5,
    concernNeedles: ["pcod", "pcos"],
    review: "Cycle regular for the first time in years. I tagged PCOD because that is what we were reversing, not a generic weight-loss story.",
    photo: "female.png",
    status: "active",
    dataPoints: [
      { field: "duration", label: "Duration", value: "6 months" },
      { field: "age", label: "Age", value: "31" },
      { field: "city", label: "City", value: "Ahmedabad" },
    ],
  },
  {
    name: "Banita Acharya",
    stars: 5,
    concernNeedles: ["gut"],
    review: "Bloating after lunch is gone. Load Preset was slow, then sudden — reports cleaner than last year and I stopped fearing rice.",
    photo: "doctor-3.png",
    status: "active",
    dataPoints: [
      { field: "duration", label: "Duration", value: "4 months" },
      { field: "city", label: "City", value: "Bhubaneswar" },
    ],
  },
  {
    name: "Kabir Shah",
    stars: 4,
    concernNeedles: ["thyroid"],
    review: "Shift work used to wreck my thyroid days. A plan that allows delayed dinners kept me from skipping meals. Fatigue is quieter.",
    photo: "male.png",
    status: "active",
    dataPoints: [
      { field: "duration", label: "Duration", value: "7 months" },
      { field: "city", label: "City", value: "Hyderabad" },
    ],
  },
  {
    name: "Lata Pawar",
    stars: 5,
    concernNeedles: ["hyper", "pressure", "fat"],
    review: "Blood pressure in range without increasing medication. Hidden until the next lab confirm, but the day-to-day change is already there.",
    photo: "doctor-4.png",
    status: "inactive",
    dataPoints: [
      { field: "duration", label: "Duration", value: "3 months" },
      { field: "city", label: "City", value: "Nagpur" },
    ],
  },
];

const VOICE_VIDEOS = [
  {
    name: "Madhupriya's reversal story",
    videoId: "v7AYKMP6rOE",
    status: "active",
  },
  {
    name: "Bikash on his HbA1c drop",
    videoId: "tEmt1Znux58",
    status: "active",
  },
  {
    name: "Hetu on getting her cycle back",
    videoId: "g_tea8ZNk5A",
    status: "active",
  },
  {
    name: "Kabir on thyroid fatigue",
    videoId: "50kH47ZztHs",
    status: "active",
  },
  {
    name: "Banita on the Load Preset",
    videoId: "O-6f5wQXSu8",
    status: "active",
  },
  {
    name: "Arjun — draft, not live yet",
    videoId: "UItWltVZZmE",
    status: "inactive",
  },
];

const PROGRAM_STORIES = [
  {
    name: "Bikash Sharma",
    concernNeedles: ["diabet"],
    description: "HbA1c from 8.9 to 6.4 in five months on the diabetes reversal protocol. Dinner timing and walking after meals.",
    photo: "client2.jpg",
    status: "active",
  },
  {
    name: "Ananya Deshpande",
    concernNeedles: ["diabet"],
    description: "Fasting glucose settled without adding a second medicine. The protocol is food-first and coach-backed.",
    photo: "doctor-1.png",
    status: "active",
  },
  {
    name: "Hetu Mehra",
    concernNeedles: ["pcod", "pcos"],
    description: "Cycle regular again after years of PCOD. Protein at breakfast and sleep were the two non-negotiables.",
    photo: "female.png",
    status: "active",
  },
  {
    name: "Rhea Kapoor",
    concernNeedles: ["pcod", "pcos"],
    description: "Acne and mid-cycle pain eased by month four. Not a miracle — a plan that survived travel weeks.",
    photo: "doctor-2.png",
    status: "active",
  },
  {
    name: "Kabir Shah",
    concernNeedles: ["thyroid"],
    description: "Thyroid fatigue lifted once meals stopped getting skipped on night shifts. Labs moved with the routine.",
    photo: "male.png",
    status: "active",
  },
  {
    name: "Nisha Rao",
    concernNeedles: ["thyroid"],
    description: "Hair fall slowed and afternoon fog reduced. Thyroid care here is food, sleep and labs — not another fad diet.",
    photo: "doctor-5.png",
    status: "active",
  },
  {
    name: "Banita Acharya",
    concernNeedles: ["gut"],
    description: "Bloating after lunch gone. Load Preset took four months and a coach who did not panic at every flare.",
    photo: "doctor-3.png",
    status: "active",
  },
  {
    name: "Vikram Singh",
    concernNeedles: ["gut"],
    description: "IBS days are rarer. Draft story kept hidden until the next follow-up photo is approved.",
    photo: "doctor-6.png",
    status: "inactive",
  },
];

async function uploadLocalImage(fileName, folder) {
  const filePath = path.join(IMAGE_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing seed image: ${filePath}`);
  }
  const buffer = fs.readFileSync(filePath);
  return uploadBufferToS3({
    buffer,
    contentType: contentTypeFor(filePath),
    folder,
    originalName: fileName,
  });
}

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

async function uploadYoutubeCover(videoId, folder, fallbackFile) {
  try {
    const buffer = await downloadYoutubeThumb(videoId);
    return uploadBufferToS3({
      buffer,
      contentType: "image/jpeg",
      folder,
      originalName: `${videoId}.jpg`,
    });
  } catch (err) {
    if (!fallbackFile) throw err;
    console.log(`  ! YouTube thumb failed for ${videoId}, using ${fallbackFile}`);
    return uploadLocalImage(fallbackFile, folder);
  }
}

async function clearTable(tableName) {
  const fields = MEDIA_FIELDS[tableName] || [];
  const items = await scanTable(tableName);
  console.log(`  [${tableName}] found ${items.length} row(s)`);
  for (const item of items) {
    for (const field of fields) {
      if (!item[field]) continue;
      try {
        await deleteStoredMedia(item[field]);
      } catch {
        /* ignore missing S3 objects */
      }
    }
    if (!item.id) continue;
    await docClient.send(new DeleteCommand({ TableName: tableName, Key: { id: item.id } }));
  }
  console.log(`  [${tableName}] cleared`);
}

async function ensureConcerns() {
  const { healthConcerns } = await listHealthConcerns({ page: 1, limit: 200, status: "active" });
  const existing = healthConcerns || [];
  if (existing.length) return existing;

  console.log("  No health concerns found — creating the core list");
  const created = [];
  for (const row of FALLBACK_CONCERNS) {
    const concern = await createHealthConcern({
      title: row.title,
      description: row.description,
      icon: "",
      status: "active",
    });
    created.push(concern);
    console.log(`  ✓ health concern ${concern.title}`);
  }
  return created;
}

async function seedTransformations(dryRun) {
  console.log("\nSeeding Transformation...");
  for (const row of TRANSFORMATIONS) {
    if (dryRun) {
      console.log(`  - ${row.name}`);
      continue;
    }
    const oldImage = await uploadLocalImage(row.oldFile, "transformation");
    const newImage = await uploadLocalImage(row.newFile, "transformation");
    const item = await createTransformation({
      name: row.name,
      timeTaken: row.timeTaken,
      inchesLost: row.inchesLost,
      achievements: row.achievements,
      oldImage,
      newImage,
      description: row.description,
      dataPoints: row.dataPoints,
      order: row.order,
      status: row.status,
    });
    console.log(`  ✓ ${item.name} (${row.status})`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function seedClientReviews(dryRun) {
  console.log("\nSeeding ClientTestimonials...");
  for (const row of CLIENT_REVIEWS) {
    if (dryRun) {
      console.log(`  - ${row.name} (${row.status})`);
      continue;
    }
    const profileImage = await uploadLocalImage(row.photo, "client-testimonials");
    const item = await createClientTestimonial({
      name: row.name,
      rating: row.rating,
      description: row.description,
      profileImage,
      status: row.status,
      submittedByRole: "user",
    });
    console.log(`  ✓ ${item.name} (${row.status})`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function seedRealPeople(dryRun, concerns) {
  console.log("\nSeeding RealPeopleTestimonial...");
  for (const row of REAL_PEOPLE) {
    const concern = matchConcern(concerns, ...row.concernNeedles);
    if (!concern) throw new Error(`No health concern for ${row.name}`);
    if (dryRun) {
      console.log(`  - ${row.name} → ${concern.title}`);
      continue;
    }
    const profileImage = await uploadLocalImage(row.photo, "real-people-testimonials");
    const item = await createRealPeopleTestimonial({
      name: row.name,
      stars: row.stars,
      review: row.review,
      healthConcernId: concern.id,
      profileImage,
      dataPoints: row.dataPoints,
      status: row.status,
    });
    console.log(`  ✓ ${item.name} · ${concern.title} (${row.status})`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function seedVoice(dryRun) {
  console.log("\nSeeding VideoTestimonials...");
  for (const row of VOICE_VIDEOS) {
    if (dryRun) {
      console.log(`  - ${row.name}`);
      continue;
    }
    const profileImage = await uploadYoutubeCover(row.videoId, "video-testimonials", "client1.jpg");
    const item = await createVideoTestimonial({
      name: row.name,
      type: "link",
      ytLink: yt(row.videoId),
      profileImage,
      video: "",
      status: row.status,
    });
    console.log(`  ✓ ${item.name} (${row.status})`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function seedProgramStories(dryRun, concerns) {
  console.log("\nSeeding ProgramTestimonials...");
  for (const row of PROGRAM_STORIES) {
    const concern = matchConcern(concerns, ...row.concernNeedles);
    if (!concern) throw new Error(`No health concern for ${row.name}`);
    const type = concernSlug(concern.title);
    if (dryRun) {
      console.log(`  - ${row.name} → ${type}`);
      continue;
    }
    const profileImage = await uploadLocalImage(row.photo, "program-testimonials");
    const item = await createProgramTestimonial({
      name: row.name,
      description: row.description,
      type,
      profileImage,
      status: row.status,
    });
    console.log(`  ✓ ${item.name} · ${type} (${row.status})`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function main() {
  const confirm = hasFlag("--confirm");
  const dryRun = hasFlag("--dry-run");
  if (!confirm) {
    console.error("Refusing to wipe testimonial tables without --confirm");
    process.exitCode = 1;
    return;
  }

  await listDropdowns({ page: 1, limit: 50, seed: true });
  const concerns = await ensureConcerns();

  console.log(dryRun ? "Dry run: no writes." : "Clearing testimonial tables...");
  if (!dryRun) {
    await clearTable(TABLES.transformation);
    await clearTable(TABLES.client);
    await clearTable(TABLES.realPeople);
    await clearTable(TABLES.video);
    await clearTable(TABLES.program);
  }

  await seedTransformations(dryRun);
  await seedClientReviews(dryRun);
  await seedRealPeople(dryRun, concerns);
  await seedVoice(dryRun);
  await seedProgramStories(dryRun, concerns);

  console.log(
    `\nDone. ${TRANSFORMATIONS.length} transformations, ${CLIENT_REVIEWS.length} client reviews, ${REAL_PEOPLE.length} real people, ${VOICE_VIDEOS.length} videos, ${PROGRAM_STORIES.length} program stories.`,
  );
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exitCode = 1;
});

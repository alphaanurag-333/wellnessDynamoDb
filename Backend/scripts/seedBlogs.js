/**
 * Seed BlogConfig + BlogPost with genuine IR Wellness blog entries.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedBlogs.js
 */
require("dotenv").config();

const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const {
  createBlogConfigShell,
  getBlogConfigRecord,
} = require("../models/blogConfigModel");
const { createBlogPost } = require("../models/blogPostModel");

const POST_TABLE = "BlogPost";

const BLOG_POSTS = [
  {
    title: "Why medicine-free healing starts with your daily routine",
    description:
      "Most chronic conditions improve when sleep, meal timing, movement, and stress recovery are aligned. At IR Wellness, we help families rebuild these foundations before adding clinical protocols — because sustainable healing is built on habits, not shortcuts.",
    status: "active",
    sortOrder: 1,
  },
  {
    title: "Understanding insulin resistance without the medical jargon",
    description:
      "Insulin resistance is one of the most common root causes behind fatigue, weight gain, and PCOD. This article explains how blood sugar spikes, late-night eating, and low activity affect your body — and what practical steps can reverse the trend over 90 days.",
    status: "active",
    sortOrder: 2,
  },
  {
    title: "5 gut-friendly breakfast ideas for busy Indian families",
    description:
      "From soft poha dosa to high-fibre oats khichdi, these breakfasts are easy to cook, gentle on digestion, and designed for real Indian kitchens. Swap refined flour and sugary cereals for meals that keep energy steady through the morning.",
    status: "active",
    sortOrder: 3,
  },
  {
    title: "How wellness coaching supports your clinical protocol",
    description:
      "Clinical care sets the direction; coaching keeps you on the path. Our coaches help with meal planning, accountability, and mindset shifts between doctor reviews — so the protocol you receive actually fits your home, work, and family life.",
    status: "active",
    sortOrder: 4,
  },
  {
    title: "Thyroid care: what to eat, what to avoid, and why timing matters",
    description:
      "Thyroid health is sensitive to iodine, selenium, stress, and sleep quality. Learn which everyday foods support thyroid function, which habits slow recovery, and how a personalised plan differs from generic “thyroid diet” lists online.",
    status: "active",
    sortOrder: 5,
  },
  {
    title: "Real stories: reversing pre-diabetes in 6 months",
    description:
      "When fasting glucose and HbA1c start climbing, many families panic. This piece walks through how one client combined portion control, walking after meals, and coach check-ins to bring markers back into range — without extreme fasting or fad diets.",
    status: "active",
    sortOrder: 6,
  },
  {
    title: "Stress, cortisol, and belly fat — the connection explained",
    description:
      "Chronic stress raises cortisol, which can increase cravings, disturb sleep, and store fat around the abdomen. We break down simple breathwork, sleep hygiene, and evening routines that help lower stress load alongside nutrition changes.",
    status: "inactive",
    sortOrder: 7,
  },
  {
    title: "Building a medicine-free lifestyle for your children",
    description:
      "Childhood obesity, early PCOD signs, and screen-time habits are rising across urban India. Parents can model better food choices, outdoor play, and family meals — this guide shares age-appropriate steps without shame or restrictive dieting.",
    status: "inactive",
    sortOrder: 8,
  },
];

async function existingPostTitles() {
  const seen = new Set();
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: POST_TABLE,
        ProjectionExpression: "#t",
        ExpressionAttributeNames: { "#t": "title" },
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

async function ensureBlogConfig() {
  const existing = await getBlogConfigRecord();
  if (existing) {
    console.log("  ✓ BlogConfig already exists (app + web enabled)");
    return;
  }

  await createBlogConfigShell();
  console.log("  ✓ BlogConfig created (appOn + webOn enabled)");
}

async function main() {
  console.log("Seeding blogs...\n");

  await ensureBlogConfig();
  console.log("");

  const seen = await existingPostTitles();
  let created = 0;
  let skipped = 0;

  for (const row of BLOG_POSTS) {
    const key = String(row.title || "").trim().toLowerCase();
    if (seen.has(key)) {
      console.log(`  - skipped (exists): ${row.title}`);
      skipped += 1;
      continue;
    }

    const post = await createBlogPost({
      title: row.title,
      description: row.description,
      coverImage: "",
      status: row.status,
      sortOrder: row.sortOrder,
    });

    console.log(`  ✓ ${row.title} [${row.status}] → ${post.id}`);
    created += 1;
    seen.add(key);
  }

  console.log(`\nDone: ${created} posts created, ${skipped} skipped.`);
  console.log("Tip: add cover images from Admin → Blogs → Gallery or per post.");
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exitCode = 1;
});

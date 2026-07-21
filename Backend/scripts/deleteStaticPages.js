/**
 * Delete StaticPage records by slug.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/deleteStaticPages.js
 */
require("dotenv").config();

const { getPageBySlug, deletePage } = require("../models/staticPageModel");

const SLUGS_TO_DELETE = [
  "community-guidelines",
  "contact-us",
  "cancellation-policy",
  "refund-policy",
];

async function main() {
  console.log("Deleting StaticPage records...\n");

  let deleted = 0;
  let missing = 0;

  for (const slug of SLUGS_TO_DELETE) {
    const page = await getPageBySlug(slug);
    if (!page) {
      console.log(`  - not found: ${slug}`);
      missing += 1;
      continue;
    }

    await deletePage(page.id);
    console.log(`  ✓ deleted: ${page.title} (${slug}) → ${page.id}`);
    deleted += 1;
  }

  console.log(`\nDone: ${deleted} deleted, ${missing} not found.`);
}

main().catch((err) => {
  console.error("Delete failed:", err.message || err);
  process.exitCode = 1;
});

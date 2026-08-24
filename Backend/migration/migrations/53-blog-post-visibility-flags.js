/**
 * Migration 53: Blog post visibility flags (retired).
 *
 * Blogs were removed from the product. Keep this id so migrateAll still
 * loads a sequential file; the runner is a no-op.
 */
async function migrateBlogPostVisibilityFlags() {
  console.log("  Blogs feature removed — skip BlogPost visibility backfill");
}

module.exports = {
  id: "53-blog-post-visibility-flags",
  migrateBlogPostVisibilityFlags,
};

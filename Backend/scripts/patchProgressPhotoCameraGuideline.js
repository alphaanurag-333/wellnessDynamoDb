/**
 * Update progress_photo_guidelines camera line in AppConfig (public app-config API).
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/patchProgressPhotoCameraGuideline.js
 */
require("dotenv").config();

const {
  getAppConfig,
  updateAppConfig,
  patchProgressPhotoCameraGuideline,
} = require("../models/appConfigModel");

async function main() {
  const config = await getAppConfig();
  if (!config) {
    console.error("AppConfig record not found. Create it via POST /api/admin/app-config first.");
    process.exitCode = 1;
    return;
  }

  const { guidelines, changed } = patchProgressPhotoCameraGuideline(
    config.progress_photo_guidelines,
  );

  if (!changed) {
    console.log("Camera guideline already up to date (or no matching legacy line found).");
    return;
  }

  await updateAppConfig({ progress_photo_guidelines: guidelines });
  console.log("Updated progress_photo_guidelines.en camera line in AppConfig.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

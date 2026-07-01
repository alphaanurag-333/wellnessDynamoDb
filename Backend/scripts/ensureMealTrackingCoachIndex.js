/**
 * Ensures MealTracking.CoachCreatedAtIndex exists (required for meal pending-review APIs).
 *
 * Usage (from Backend/):
 *   node scripts/ensureMealTrackingCoachIndex.js
 */
require("dotenv").config();

const { migrateMealTrackingReview } = require("../migration/migrations/17-meal-tracking-review");

migrateMealTrackingReview()
  .then((result) => {
    console.log("Done:", result);
  })
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exitCode = 1;
  });

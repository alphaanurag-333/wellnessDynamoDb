/**
 * Ensures RealPeopleTestimonial.HealthConcernCreatedAtIndex exists and backfills healthConcernId.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/ensureRealPeopleTestimonialHealthConcernIndex.js
 */
require("dotenv").config();

const {
  migrateRealPeopleTestimonialHealthConcern,
} = require("../migration/migrations/23-real-people-testimonial-health-concern");

migrateRealPeopleTestimonialHealthConcern()
  .then((result) => {
    console.log("Done:", result);
  })
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exitCode = 1;
  });

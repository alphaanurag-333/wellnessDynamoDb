/**
 * Migration 35: Seed ASSISTANT / TRAINEE / SUPPORT Role templates (optional defaults).
 *
 * Idempotent: skips when slug already exists.
 */
const { getRoleBySlug, createRole } = require("../../models/roleModel");
const { ALL_ASSISTANT_PERMISSIONS } = require("../../config/assistantPermissionCatalog");
const { ALL_TRAINEE_PERMISSIONS } = require("../../config/traineePermissionCatalog");
const { ALL_SUPPORT_PERMISSIONS } = require("../../config/supportPermissionCatalog");

const SEEDS = [
  {
    name: "Default Assistant",
    slug: "default-assistant",
    scope: "ASSISTANT",
    permissions: ALL_ASSISTANT_PERMISSIONS,
  },
  {
    name: "Default Trainee",
    slug: "default-trainee",
    scope: "TRAINEE",
    permissions: ALL_TRAINEE_PERMISSIONS,
  },
  {
    name: "Default Support",
    slug: "default-support",
    scope: "SUPPORT",
    permissions: ALL_SUPPORT_PERMISSIONS,
  },
];

async function migrateAccountRoleSeeds() {
  for (const seed of SEEDS) {
    const existing = await getRoleBySlug(seed.slug);
    if (existing) {
      console.log(`  [Role] ${seed.slug} already exists — skip`);
      continue;
    }
    await createRole({
      name: seed.name,
      slug: seed.slug,
      scope: seed.scope,
      permissions: seed.permissions,
      status: "active",
    });
    console.log(`  [Role] created ${seed.slug} (${seed.scope})`);
  }
}

module.exports = {
  id: "35-account-role-seeds",
  migrateAccountRoleSeeds,
};

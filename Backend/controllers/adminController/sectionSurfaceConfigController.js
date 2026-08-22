const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  SECTION_CONFIG_IDS,
  resolveConfigId,
  createSectionSurfaceConfigShell,
  getSectionSurfaceConfig,
  getSectionSurfaceConfigRecord,
  updateSectionSurfaceConfig,
  parseBool,
} = require("../../models/sectionSurfaceConfigModel");

function requireSection(req) {
  const section = String(req.params.section || "").trim().toLowerCase();
  if (!resolveConfigId(section)) {
    throw new AppError(
      `Unknown section. Allowed: ${Object.keys(SECTION_CONFIG_IDS).join(", ")}`,
      400
    );
  }
  return section;
}

exports.getSectionSurfaceConfigController = asyncHandler(async (req, res) => {
  const section = requireSection(req);
  const config = await getSectionSurfaceConfig(section);
  return res.status(200).json({
    status: true,
    message: config ? "Section surface config fetched" : "No section surface config configured yet",
    data: config,
  });
});

exports.createSectionSurfaceConfigController = asyncHandler(async (req, res) => {
  const section = requireSection(req);
  const existing = await getSectionSurfaceConfigRecord(section);
  if (existing) {
    throw new AppError(
      `Section surface config already exists. Use PATCH /api/admin/section-surface-config/${section} to update.`,
      409
    );
  }

  await createSectionSurfaceConfigShell(section);
  const config = await getSectionSurfaceConfig(section);

  return res.status(201).json({
    status: true,
    message: "Section surface config created",
    data: config,
  });
});

exports.updateSectionSurfaceConfigController = asyncHandler(async (req, res) => {
  const section = requireSection(req);
  const existing = await getSectionSurfaceConfigRecord(section);
  if (!existing) {
    throw new AppError(
      `Section surface config not found. Use POST /api/admin/section-surface-config/${section} to create.`,
      404
    );
  }

  const updates = {};
  if (req.body.appOn !== undefined) updates.appOn = parseBool(req.body.appOn, true);
  if (req.body.webOn !== undefined) updates.webOn = parseBool(req.body.webOn, true);

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let config;
  try {
    config = await updateSectionSurfaceConfig(section, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Section surface config not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Section surface config updated",
    data: config,
  });
});

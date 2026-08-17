const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listDropdowns,
  getDropdownByIdOrSlug,
  createDropdown,
  updateDropdown,
  deleteDropdown,
  addOption,
  updateOption,
  deleteOption,
  toPublicList,
} = require("../../models/configDropdownModel");

function throwModelError(err) {
  if (err?.statusCode) throw new AppError(err.message, err.statusCode);
  if (err?.name === "ConditionalCheckFailedException") {
    throw new AppError("Dropdown list not found", 404);
  }
  throw err;
}

exports.listConfigDropdownsController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const search = req.query.search ? String(req.query.search).trim() : undefined;

  const data = await listDropdowns({ page, limit, status, search, seed: true });

  return res.status(200).json({
    status: true,
    lists: data.lists.map((row) => toPublicList(row)),
    pagination: data.pagination,
  });
});

exports.getConfigDropdownController = asyncHandler(async (req, res) => {
  const list = await getDropdownByIdOrSlug(req.params.id);
  if (!list) throw new AppError("Dropdown list not found", 404);
  return res.status(200).json({ status: true, list: toPublicList(list) });
});

exports.createConfigDropdownController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  if (!title) throw new AppError("title is required", 400);

  let list;
  try {
    list = await createDropdown({
      title,
      slug: req.body.slug,
      wide: req.body.wide,
      status: req.body.status,
      options: req.body.options,
      sortOrder: req.body.sortOrder,
    });
  } catch (err) {
    throwModelError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Dropdown list created successfully",
    list: toPublicList(list),
  });
});

exports.updateConfigDropdownController = asyncHandler(async (req, res) => {
  const current = await getDropdownByIdOrSlug(req.params.id);
  if (!current) throw new AppError("Dropdown list not found", 404);

  const updates = {};
  if (req.body.title !== undefined) {
    const title = String(req.body.title).trim();
    if (!title) throw new AppError("title cannot be empty", 400);
    updates.title = title;
  }
  if (req.body.slug !== undefined) updates.slug = req.body.slug;
  if (req.body.wide !== undefined) updates.wide = req.body.wide;
  if (req.body.status !== undefined) {
    const status = String(req.body.status).toLowerCase().trim();
    if (!["active", "inactive"].includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (req.body.sortOrder !== undefined) updates.sortOrder = req.body.sortOrder;
  if (req.body.options !== undefined) {
    if (!Array.isArray(req.body.options)) throw new AppError("options must be an array", 400);
    updates.options = req.body.options;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let list;
  try {
    list = await updateDropdown(current.id, updates);
  } catch (err) {
    throwModelError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Dropdown list updated successfully",
    list: toPublicList(list),
  });
});

exports.deleteConfigDropdownController = asyncHandler(async (req, res) => {
  const current = await getDropdownByIdOrSlug(req.params.id);
  if (!current) throw new AppError("Dropdown list not found", 404);
  try {
    await deleteDropdown(current.id);
  } catch (err) {
    throwModelError(err);
  }
  return res.status(200).json({
    status: true,
    message: "Dropdown list deleted successfully",
  });
});

exports.addConfigDropdownOptionController = asyncHandler(async (req, res) => {
  const current = await getDropdownByIdOrSlug(req.params.id);
  if (!current) throw new AppError("Dropdown list not found", 404);
  const label = String(req.body.label || "").trim();
  if (!label) throw new AppError("label is required", 400);

  let result;
  try {
    result = await addOption(current.id, {
      label,
      value: req.body.value,
      icon: req.body.icon,
      on: req.body.on,
    });
  } catch (err) {
    throwModelError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Option added successfully",
    option: result.option,
    list: toPublicList(result.list),
  });
});

exports.updateConfigDropdownOptionController = asyncHandler(async (req, res) => {
  const current = await getDropdownByIdOrSlug(req.params.id);
  if (!current) throw new AppError("Dropdown list not found", 404);

  const patch = {};
  if (req.body.label !== undefined) {
    const label = String(req.body.label).trim();
    if (!label) throw new AppError("label cannot be empty", 400);
    patch.label = label;
  }
  if (req.body.value !== undefined) patch.value = req.body.value;
  if (req.body.icon !== undefined) patch.icon = String(req.body.icon).trim();
  if (req.body.on !== undefined) patch.on = Boolean(req.body.on);
  if (req.body.sortOrder !== undefined) patch.sortOrder = req.body.sortOrder;
  if (Object.keys(patch).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let result;
  try {
    result = await updateOption(current.id, req.params.optionId, patch);
  } catch (err) {
    throwModelError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Option updated successfully",
    option: result.option,
    list: toPublicList(result.list),
  });
});

exports.deleteConfigDropdownOptionController = asyncHandler(async (req, res) => {
  const current = await getDropdownByIdOrSlug(req.params.id);
  if (!current) throw new AppError("Dropdown list not found", 404);

  let list;
  try {
    list = await deleteOption(current.id, req.params.optionId);
  } catch (err) {
    throwModelError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Option deleted successfully",
    list: toPublicList(list),
  });
});

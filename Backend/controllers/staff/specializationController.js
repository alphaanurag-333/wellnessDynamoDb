const { asyncHandler } = require("../../utils/asyncHandler");
const { listSpecializations } = require("../../models/specializationModel");

exports.listActiveSpecializations = asyncHandler(async (_req, res) => {
  const data = await listSpecializations({ page: 1, limit: 200, status: "active" });
  const specializations = (data.specializations || []).map((row) => ({
    id: row.id,
    _id: row.id,
    title: row.title,
  }));

  return res.status(200).json({
    status: true,
    specializations,
  });
});

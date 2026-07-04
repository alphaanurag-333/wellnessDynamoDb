const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getContactInquiryById,
  updateContactInquiry,
  deleteContactInquiry,
  listContactInquiries,
  normalizeStatus,
} = require("../../models/contactInquiryModel");

exports.listContactInquiriesController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const search = req.query.search ? String(req.query.search).trim() : undefined;
  const inquiryType = req.query.inquiryType ? String(req.query.inquiryType).trim() : undefined;

  const data = await listContactInquiries({ page, limit, status, search, inquiryType });

  return res.status(200).json({
    status: true,
    contactInquiries: data.contactInquiries,
    pagination: data.pagination,
  });
});

exports.getContactInquiryByIdController = asyncHandler(async (req, res) => {
  const inquiry = await getContactInquiryById(req.params.id);
  if (!inquiry) {
    throw new AppError("Contact inquiry not found", 404);
  }

  return res.status(200).json({
    status: true,
    contactInquiry: inquiry,
  });
});

exports.updateContactInquiryController = asyncHandler(async (req, res) => {
  const updates = {};

  if (req.body.status !== undefined) {
    const status = String(req.body.status).trim().toLowerCase();
    if (!["new", "read", "archived"].includes(status)) {
      throw new AppError("status must be new, read, or archived", 400);
    }
    updates.status = normalizeStatus(status);
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let inquiry;
  try {
    inquiry = await updateContactInquiry(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Contact inquiry not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Contact inquiry updated successfully",
    contactInquiry: inquiry,
  });
});

exports.deleteContactInquiryController = asyncHandler(async (req, res) => {
  try {
    await deleteContactInquiry(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Contact inquiry not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Contact inquiry deleted successfully",
  });
});

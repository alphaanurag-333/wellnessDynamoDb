const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { verifyAccessToken } = require("../utils/jwt");
const { User, Vendor, VenueVendor, Admin, DeliveryBoy } = require("../models");

function readBearer(req) {
  const h = req.headers.authorization;
  return h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

function assertActiveAccount(doc) {
  if (doc.status === "blocked") {
    throw new AppError("Account is blocked", 403);
  }
  if (doc.status === "inactive") {
    throw new AppError("Account is inactive", 403);
  }
}

function protect(role, Model, select) {
  return asyncHandler(async (req, res, next) => {
    const token = readBearer(req);
    if (!token) {
      throw new AppError("Authentication required", 401);
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }

    if (payload.role !== role) {
      throw new AppError("Forbidden", 403);
    }

    const account = await Model.findById(payload.sub).select(select);
    if (!account) {
      throw new AppError("Account not found", 401);
    }

    assertActiveAccount(account);

    req.user = account;
    req.auth = { role, sub: payload.sub };
    next();
  });
}

module.exports = {
  protectUser: protect("user", User, "-passwordHash"),
  protectVendor: protect("vendor", Vendor, "-passwordHash"),
  protectVenueVendor: protect("venueVendor", VenueVendor, "-passwordHash"),
  protectAdmin: protect("admin", Admin, "-password"),
  protectDeliveryBoy: protect("deliveryBoy", DeliveryBoy, "-passwordHash"),
};

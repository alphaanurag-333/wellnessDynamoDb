const createUploader = require("../utils/fileUploader");

function optionalMultipart(uploadMiddleware) {
  return (req, res, next) => {
    if (req.is("multipart/form-data")) {
      return uploadMiddleware(req, res, next);
    }
    next();
  };
}

const userUpload = createUploader("user").single("file");
const vendorUpload = createUploader("vendor").single("file");
const vendorUploads = createUploader("vendor").fields([
  { name: "file", maxCount: 1 },
  { name: "aadhaarCardFront", maxCount: 1 },
  { name: "aadhaarCardBack", maxCount: 1 },
  { name: "panCard", maxCount: 1 },
  { name: "shopLogo", maxCount: 1 },
  { name: "shopImages", maxCount: 20 },
  { name: "shopVideos", maxCount: 10 },
  { name: "shopBanner", maxCount: 1 },
]);
const venueVendorUploads = createUploader("venue-vendor").fields([
  { name: "file", maxCount: 1 },
  { name: "aadhaarCard", maxCount: 1 },
  { name: "panCard", maxCount: 1 },
]);
const adminUpload = createUploader("admin").single("file");
const deliveryUpload = createUploader("delivery").single("file");
const deliveryUploads = createUploader("delivery").fields([
  { name: "file", maxCount: 1 },
  { name: "drivingLicenseFront", maxCount: 1 },
  { name: "drivingLicenseBack", maxCount: 1 },
]);
const categoryUpload = createUploader("category").single("file");
const subCategoryUpload = createUploader("sub-category").single("file");
const bannerUpload = createUploader("banner").single("file");
const promotionUpload = createUploader("promotion").single("file");
const notificationUpload = createUploader("notification").single("file");
const productUploads = createUploader("product").any();
const venueUploads = createUploader("venue").any();
const amenitiesUpload = createUploader("amenities").single("file");

exports.optionalUserFile = optionalMultipart(userUpload);
exports.optionalVendorFile = optionalMultipart(vendorUpload);
exports.optionalVendorFiles = optionalMultipart(vendorUploads);
exports.optionalVenueVendorFiles = optionalMultipart(venueVendorUploads);
exports.optionalAdminFile = optionalMultipart(adminUpload);
exports.optionalDeliveryBoyFile = optionalMultipart(deliveryUpload);
exports.optionalDeliveryBoyFiles = optionalMultipart(deliveryUploads);
exports.optionalCategoryFile = optionalMultipart(categoryUpload);
exports.optionalSubCategoryFile = optionalMultipart(subCategoryUpload);
exports.optionalBannerFile = optionalMultipart(bannerUpload);
exports.optionalPromotionFile = optionalMultipart(promotionUpload);
exports.optionalNotificationFile = optionalMultipart(notificationUpload);
exports.optionalProductFiles = optionalMultipart(productUploads);
exports.optionalVenueFiles = optionalMultipart(venueUploads);
exports.optionalAmenitiesFile = optionalMultipart(amenitiesUpload);

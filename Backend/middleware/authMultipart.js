const createUploader = require("../utils/fileUploader");

function optionalMultipart(uploadMiddleware) {
  return (req, res, next) => {
    if (req.is("multipart/form-data")) {
      return uploadMiddleware(req, res, next);
    }
    next();
  };
}

const adminUpload = createUploader("admin").single("file");
const bannerUpload = createUploader("banner").single("file");
const notificationUpload = createUploader("notification").single("file");
const healthConcernUpload = createUploader("health-concern").single("file");
const transformationUploads = createUploader("transformation").fields([
  { name: "oldImage", maxCount: 1 },
  { name: "newImage", maxCount: 1 },
]);

exports.optionalAdminFile = optionalMultipart(adminUpload);
exports.optionalBannerFile = optionalMultipart(bannerUpload);
exports.optionalNotificationFile = optionalMultipart(notificationUpload);
exports.optionalHealthConcernFile = optionalMultipart(healthConcernUpload);
exports.optionalTransformationFiles = optionalMultipart(transformationUploads);

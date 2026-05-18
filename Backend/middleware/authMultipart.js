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
const celebrationUpload = createUploader("celebration-banners").single("file");
const notificationUpload = createUploader("notification").single("file");
const clientTestimonialsUpload = createUploader("client-testimonials").single("file");
const videoTestimonialsUpload = createUploader("video-testimonials").fields([
  { name: "profileImage", maxCount: 1 },
  { name: "videoFile", maxCount: 1 },
]);
const userUpload = createUploader("user").single("file");
const healthConcernUpload = createUploader("health-concern").single("file");
const healthToolUpload = createUploader("health-tool").single("file");
const healthRecipeUpload = createUploader("health-recipe").fields([
  { name: "thumbnailFile", maxCount: 1 },
  { name: "videoFile", maxCount: 1 },
  // Keep legacy "file" field support for older clients sending thumbnail as "file".
  { name: "file", maxCount: 1 },
]);
const yogaUpload = createUploader("yoga").fields([
  { name: "thumbnailFile", maxCount: 1 },
  { name: "videoFile", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);
const transformationUploads = createUploader("transformation").fields([
  { name: "oldImage", maxCount: 1 },
  { name: "newImage", maxCount: 1 },
]);
const wellnessCoachUpload = createUploader("wellness-coach").single("file");
const assistantWellnessCoachUpload = createUploader("assistant-wellness-coach").single("file");

exports.optionalAdminFile = optionalMultipart(adminUpload);
exports.optionalWellnessCoachFile = optionalMultipart(wellnessCoachUpload);
exports.optionalAssistantWellnessCoachFile = optionalMultipart(assistantWellnessCoachUpload);
exports.optionalUserFile = optionalMultipart(userUpload);
exports.optionalBannerFile = optionalMultipart(bannerUpload);
exports.optionalCelebrationFile = optionalMultipart(celebrationUpload);
exports.optionalNotificationFile = optionalMultipart(notificationUpload);
exports.optionalClientTestimonialsFile = optionalMultipart(clientTestimonialsUpload);
exports.optionalVideoTestimonialsFiles = optionalMultipart(videoTestimonialsUpload);
exports.optionalHealthConcernFile = optionalMultipart(healthConcernUpload);
exports.optionalHealthToolFile = optionalMultipart(healthToolUpload);
exports.optionalHealthRecipeFile = optionalMultipart(healthRecipeUpload);
exports.optionalYogaFile = optionalMultipart(yogaUpload);
exports.optionalTransformationFiles = optionalMultipart(transformationUploads);

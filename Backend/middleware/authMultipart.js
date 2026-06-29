const createUploader = require("../utils/fileUploader");
const createMemoryUploader = createUploader.createMemoryUploader;

function optionalMultipart(uploadMiddleware) {
  return (req, res, next) => {
    if (req.is("multipart/form-data")) {
      return uploadMiddleware(req, res, next);
    }
    next();
  };
}

const memoryFields = (fields) => createMemoryUploader().fields(fields);
const memorySingle = (field) => createMemoryUploader().single(field);

const adminUpload = memorySingle("file");
const bannerUpload = memorySingle("file");
const notificationUpload = memorySingle("file");
const clientTestimonialsUpload = memorySingle("file");
const wellnessCoachUpload = memorySingle("file");
const assistantWellnessCoachUpload = memorySingle("file");
const healthConcernUpload = memorySingle("file");
const healthToolUpload = memorySingle("file");
const userUpload = memorySingle("file");
const weightPicUpload = memorySingle("weight_pic");
const profileImageUpload = memorySingle("file");

const appConfigUpload = memoryFields([
  { name: "admin_logo", maxCount: 1 },
  { name: "user_logo", maxCount: 1 },
  { name: "favicon", maxCount: 1 },
]);

const videoTestimonialsUpload = memoryFields([
  { name: "profileImage", maxCount: 1 },
  { name: "videoFile", maxCount: 1 },
]);

const cofounderMessageUpload = memoryFields([
  { name: "profileImage", maxCount: 1 },
  { name: "videoFile", maxCount: 1 },
]);

const healthRecipeUpload = memoryFields([
  { name: "thumbnailFile", maxCount: 1 },
  { name: "videoFile", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

const yogaUpload = memoryFields([
  { name: "thumbnailFile", maxCount: 1 },
  { name: "videoFile", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

const transformationUploads = memoryFields([
  { name: "oldImage", maxCount: 1 },
  { name: "newImage", maxCount: 1 },
]);

exports.optionalAdminFile = optionalMultipart(adminUpload);
exports.uploadAppConfigFiles = optionalMultipart(appConfigUpload);
exports.optionalWellnessCoachFile = optionalMultipart(wellnessCoachUpload);
exports.optionalAssistantWellnessCoachFile = optionalMultipart(assistantWellnessCoachUpload);
exports.optionalUserFile = optionalMultipart(userUpload);
exports.optionalWeightPicFile = optionalMultipart(weightPicUpload);
exports.optionalProfileImageFile = optionalMultipart(profileImageUpload);
exports.optionalBannerFile = optionalMultipart(bannerUpload);
exports.optionalNotificationFile = optionalMultipart(notificationUpload);
exports.optionalClientTestimonialsFile = optionalMultipart(clientTestimonialsUpload);
exports.optionalVideoTestimonialsFiles = optionalMultipart(videoTestimonialsUpload);
exports.optionalCofounderMessageFiles = optionalMultipart(cofounderMessageUpload);
exports.optionalHealthConcernFile = optionalMultipart(healthConcernUpload);
exports.optionalHealthToolFile = optionalMultipart(healthToolUpload);
exports.optionalHealthRecipeFile = optionalMultipart(healthRecipeUpload);
exports.optionalYogaFile = optionalMultipart(yogaUpload);
exports.optionalTransformationFiles = optionalMultipart(transformationUploads);
const dietPlanUpload = memorySingle("file");
exports.optionalDietPlanFile = optionalMultipart(dietPlanUpload);

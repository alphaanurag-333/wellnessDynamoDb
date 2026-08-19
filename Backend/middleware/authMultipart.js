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
const bannerUpload = memoryFields([
  { name: "file", maxCount: 1 },
  { name: "mobileImage", maxCount: 1 },
]);
const notificationUpload = memorySingle("file");
const clientTestimonialsUpload = memorySingle("file");
const leadershipNotesUpload = memorySingle("file");
const wellnessTeamNotesUpload = memorySingle("file");
const programTestimonialUpload = memorySingle("file");
const wellnessCoachUpload = memorySingle("file");
const assistantWellnessCoachUpload = memorySingle("file");
const healthConcernUpload = memorySingle("file");
const healthToolUpload = memorySingle("file");
const supplementUpload = memorySingle("file");
const mentalWellbeingUpload = memoryFields([
  { name: "file", maxCount: 1 },
  { name: "thumbnailFile", maxCount: 1 },
  { name: "videoFile", maxCount: 1 },
]);
const userUpload = memoryFields([
  { name: "file", maxCount: 1 },
  { name: "presentablePic", maxCount: 1 },
]);
const weightPicUpload = memorySingle("weight_pic");
const profileImageUpload = memorySingle("file");

const appConfigUpload = memoryFields([
  { name: "admin_logo", maxCount: 1 },
  { name: "user_logo", maxCount: 1 },
  { name: "favicon", maxCount: 1 },
  { name: "commitment_letter_template", maxCount: 1 },
  { name: "body_measurement_guide_video", maxCount: 1 },
  { name: "body_measurement_info_image_neck", maxCount: 1 },
  { name: "body_measurement_info_image_shoulder", maxCount: 1 },
  { name: "body_measurement_info_image_chest", maxCount: 1 },
  { name: "body_measurement_info_image_waist", maxCount: 1 },
  { name: "body_measurement_info_image_hip", maxCount: 1 },
  { name: "body_measurement_info_image_thighs", maxCount: 1 },
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

const blogPostUpload = memoryFields([
  { name: "coverFile", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

const blogMediaUpload = memoryFields([
  { name: "file", maxCount: 1 },
  { name: "coverFile", maxCount: 1 },
]);

const wellnessYogaUpload = memoryFields([
  { name: "file", maxCount: 1 },
  { name: "thumbnailFile", maxCount: 1 },
  { name: "videoFile", maxCount: 1 },
]);

const physicalExerciseUpload = memoryFields([
  { name: "videoFile", maxCount: 1 },
  { name: "file", maxCount: 1 },
  { name: "thumbnailFile", maxCount: 1 },
]);

const coachContentUpload = memoryFields([
  { name: "intro_video", maxCount: 1 },
  { name: "intro_cover", maxCount: 1 },
  { name: "letter_file", maxCount: 1 },
]);

const transformationUploads = memoryFields([
  { name: "oldImage", maxCount: 1 },
  { name: "newImage", maxCount: 1 },
]);

const progressPhotoUploads = memoryFields([
  { name: "front_pic", maxCount: 1 },
  { name: "right_pic", maxCount: 1 },
  { name: "left_pic", maxCount: 1 },
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
exports.optionalLeadershipNotesFile = optionalMultipart(leadershipNotesUpload);
exports.optionalWellnessTeamNotesFile = optionalMultipart(wellnessTeamNotesUpload);
exports.optionalProgramTestimonialFile = optionalMultipart(programTestimonialUpload);
exports.optionalVideoTestimonialsFiles = optionalMultipart(videoTestimonialsUpload);
exports.optionalCofounderMessageFiles = optionalMultipart(cofounderMessageUpload);
exports.optionalHealthConcernFile = optionalMultipart(healthConcernUpload);
exports.optionalHealthToolFile = optionalMultipart(healthToolUpload);
exports.optionalSupplementFile = optionalMultipart(supplementUpload);
exports.optionalMentalWellbeingFile = optionalMultipart(mentalWellbeingUpload);
exports.optionalWellnessYogaFile = optionalMultipart(wellnessYogaUpload);
exports.optionalHealthRecipeFile = optionalMultipart(healthRecipeUpload);
exports.optionalYogaFile = optionalMultipart(yogaUpload);
exports.optionalBlogPostFile = optionalMultipart(blogPostUpload);
exports.optionalBlogMediaFile = optionalMultipart(blogMediaUpload);
exports.optionalPhysicalExerciseFile = optionalMultipart(physicalExerciseUpload);
exports.optionalCoachContentFiles = optionalMultipart(coachContentUpload);
exports.optionalTransformationFiles = optionalMultipart(transformationUploads);
exports.optionalProgressPhotoFiles = optionalMultipart(progressPhotoUploads);
const dietPlanUpload = memorySingle("file");
exports.optionalDietPlanFile = optionalMultipart(dietPlanUpload);
const supplementBillUpload = memorySingle("file");
exports.optionalSupplementBillFile = optionalMultipart(supplementBillUpload);
const commitmentLetterUpload = memorySingle("file");
exports.optionalCommitmentLetterFile = optionalMultipart(commitmentLetterUpload);

const realPeopleTestimonialUpload = memorySingle("file");
const mealPhotoUpload = memorySingle("photo");

exports.optionalRealPeopleTestimonialFile = optionalMultipart(realPeopleTestimonialUpload);
exports.optionalMealPhotoFile = optionalMultipart(mealPhotoUpload);

const healthProgressWeightPicUpload = memorySingle("weight_pic");
const healthProgressGlucosePicUpload = memorySingle("glucose_pic");
const healthProgressBpPicUpload = memorySingle("bp_pic");
const healthProgressConditionPicUpload = memorySingle("condition_pic");

exports.optionalHealthProgressWeightPicFile = optionalMultipart(
  healthProgressWeightPicUpload
);
exports.optionalHealthProgressGlucosePicFile = optionalMultipart(
  healthProgressGlucosePicUpload
);
exports.optionalHealthProgressBpFile = optionalMultipart(
  healthProgressBpPicUpload
);
exports.optionalHealthProgressConditionPicFile = optionalMultipart(
  healthProgressConditionPicUpload
);

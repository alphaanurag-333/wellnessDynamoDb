export const DEFAULT_MEASUREMENT_GUIDE_TITLE = "How to measure yourself";
export const DEFAULT_MEASUREMENT_GUIDE_DESCRIPTION =
  "Tape placement for neck, chest, waist, hips and thighs — follow along once and log your numbers in the app.";

export const MEASUREMENT_PARAMETER_DEFS = [
  { id: "neck", name: "Neck", field: "body_measurement_info_image_neck", shownField: "body_measurement_info_shown_neck" },
  { id: "shoulder", name: "Shoulder", field: "body_measurement_info_image_shoulder", shownField: "body_measurement_info_shown_shoulder" },
  { id: "chest", name: "Chest", field: "body_measurement_info_image_chest", shownField: "body_measurement_info_shown_chest" },
  { id: "waist", name: "Waist", field: "body_measurement_info_image_waist", shownField: "body_measurement_info_shown_waist" },
  { id: "hip", name: "Hips", field: "body_measurement_info_image_hip", shownField: "body_measurement_info_shown_hip" },
  { id: "thighs", name: "Thighs", field: "body_measurement_info_image_thighs", shownField: "body_measurement_info_shown_thighs" },
];

export const MEASUREMENT_GUIDE = {
  title: DEFAULT_MEASUREMENT_GUIDE_TITLE,
  description: DEFAULT_MEASUREMENT_GUIDE_DESCRIPTION,
  sourceType: "none",
  duration: "",
  live: false,
  hasCover: false,
  linkUrl: "",
  videoUrl: "",
};

export const MEASUREMENT_PARAMETERS = MEASUREMENT_PARAMETER_DEFS.map((row) => ({
  ...row,
  url: "",
  hasImage: false,
  shown: true,
}));

export const MEASUREMENT_VIDEO_MAX_SIZE_MB = 25;
export const MEASUREMENT_IMAGE_MAX_SIZE_MB = 25;

export const MEASUREMENT_VIDEO_SIZE_LABEL = "Video: 1920x1080";
export const MEASUREMENT_IMAGE_SIZE_LABEL = "Image size: 500x300";

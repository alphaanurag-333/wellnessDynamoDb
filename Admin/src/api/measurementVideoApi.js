import api, { normalizeApiError } from "../api.js";
import {
  DEFAULT_MEASUREMENT_GUIDE_DESCRIPTION,
  DEFAULT_MEASUREMENT_GUIDE_TITLE,
  MEASUREMENT_GUIDE,
  MEASUREMENT_IMAGE_MAX_SIZE_MB,
  MEASUREMENT_PARAMETER_DEFS,
  MEASUREMENT_PARAMETERS,
  MEASUREMENT_VIDEO_MAX_SIZE_MB,
} from "../data/measurementVideoData.js";

function appConfigBase() {
  return "/admin/app-config";
}

export function mapMeasurementConfig(config = {}) {
  const type = String(config.body_measurement_guide_type || "none").toLowerCase();
  const videoUrl = String(config.body_measurement_guide_video || "").trim();
  const linkUrl = String(config.body_measurement_guide_yt_link || "").trim();
  const sourceType = type === "link" || type === "video" ? type : "none";

  return {
    guide: {
      title:
        String(config.body_measurement_guide_title || "").trim() ||
        DEFAULT_MEASUREMENT_GUIDE_TITLE,
      description:
        String(config.body_measurement_guide_description || "").trim() ||
        DEFAULT_MEASUREMENT_GUIDE_DESCRIPTION,
      sourceType,
      live: sourceType !== "none",
      linkUrl,
      videoUrl,
      hasCover: Boolean(videoUrl || linkUrl),
      duration: "",
    },
    parameters: MEASUREMENT_PARAMETER_DEFS.map((row) => {
      const url = String(config[row.field] || "").trim();
      const shownRaw = config[row.shownField];
      const shown =
        shownRaw === undefined || shownRaw === null || shownRaw === ""
          ? true
          : shownRaw === true ||
            String(shownRaw).toLowerCase() === "true" ||
            String(shownRaw) === "1";
      return {
        ...row,
        url,
        hasImage: Boolean(url),
        shown,
      };
    }),
  };
}

export const EMPTY_MEASUREMENT_CONFIG = {
  guide: { ...MEASUREMENT_GUIDE },
  parameters: MEASUREMENT_PARAMETERS.map((row) => ({ ...row })),
};

export function validateMeasurementVideoFile(file) {
  if (!file) return "Choose a video file";
  const type = String(file.type || "").toLowerCase();
  if (type && !type.startsWith("video/")) return "Upload a video file";
  if (file.size > MEASUREMENT_VIDEO_MAX_SIZE_MB * 1024 * 1024) {
    return `Video must be ${MEASUREMENT_VIDEO_MAX_SIZE_MB} MB or smaller`;
  }
  return "";
}

export function validateMeasurementImageFile(file) {
  if (!file) return "Choose an image file";
  const type = String(file.type || "").toLowerCase();
  if (type && !type.startsWith("image/")) return "Upload an image file";
  if (file.size > MEASUREMENT_IMAGE_MAX_SIZE_MB * 1024 * 1024) {
    return `Image must be ${MEASUREMENT_IMAGE_MAX_SIZE_MB} MB or smaller`;
  }
  return "";
}

async function patchAppConfig(payload) {
  const { data } = await api.patch(appConfigBase(), payload);
  return mapMeasurementConfig(data?.data || {});
}

export async function getMeasurementVideoConfig() {
  try {
    const { data } = await api.get(appConfigBase());
    return mapMeasurementConfig(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveMeasurementGuideCopy(guide) {
  try {
    return await patchAppConfig({
      body_measurement_guide_title: String(guide?.title || "").trim(),
      body_measurement_guide_description: String(guide?.description || "").trim(),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveMeasurementGuideLink(url) {
  try {
    return await patchAppConfig({
      body_measurement_guide_type: "link",
      body_measurement_guide_yt_link: String(url || "").trim(),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveMeasurementGuideVideo(file) {
  const fd = new FormData();
  fd.append("body_measurement_guide_type", "video");
  fd.append("body_measurement_guide_video", file);
  try {
    return await patchAppConfig(fd);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveMeasurementGuideLive(live, guide) {
  try {
    if (!live) {
      return await patchAppConfig({ body_measurement_guide_type: "none" });
    }
    if (guide?.videoUrl) {
      return await patchAppConfig({ body_measurement_guide_type: "video" });
    }
    if (guide?.linkUrl) {
      return await patchAppConfig({
        body_measurement_guide_type: "link",
        body_measurement_guide_yt_link: guide.linkUrl,
      });
    }
    const err = new Error("Upload a video or add a link first");
    throw err;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveMeasurementParameterImage(field, file) {
  const fd = new FormData();
  fd.append(field, file);
  try {
    return await patchAppConfig(fd);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveMeasurementParameterShown(shownField, shown) {
  try {
    return await patchAppConfig({ [shownField]: Boolean(shown) });
  } catch (error) {
    normalizeApiError(error);
  }
}

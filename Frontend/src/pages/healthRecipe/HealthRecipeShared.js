import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { adminListHealthConcerns } from "../../api/adminHealthConcerns.js";
import { logout } from "../../store/authSlice.js";

export const TITLE_MIN_LEN = 2;
export const TITLE_MAX_LEN = 100;
export const DESCRIPTION_MIN_LEN = 5;
export const DESCRIPTION_MAX_LEN = 2000;
export const YT_LINK_MAX_LEN = 500;
export const VIDEO_SPECS_MAX_LEN = 2000;
export const LIST_SEARCH_MAX_LEN = 120;
export const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"]);
export const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-m4v"]);
export const LIST_LIMIT = 10;

export function emptyForm() {
  return {
    healthConcernId: "",
    title: "",
    description: "",
    type: "ytlink",
    ytLink: "",
    video: "",
    videoSpecsInput: "",
    status: "active",
  };
}

export function sanitizeTitle(value) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, TITLE_MAX_LEN);
}

export function sanitizeDescription(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, DESCRIPTION_MAX_LEN);
}

export function parseVideoSpecsInput(value) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function videoSpecsToText(specs) {
  return Array.isArray(specs) ? specs.map((x) => String(x || "").trim()).filter(Boolean).join("\n") : "";
}

export function truncate(str, max) {
  const s = String(str ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function formatDate(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export function validateForm(form, { editId, thumbnailFile, hasExistingThumbnail, videoFile, hasExistingVideo }) {
  const concernId = form.healthConcernId.trim();
  const title = form.title.trim();
  const description = form.description.trim();
  const type = String(form.type || "").trim();
  const ytLink = form.ytLink.trim();
  const video = form.video.trim();
  const status = String(form.status || "").trim();

  if (!concernId) return "Health concern is required.";
  if (!title) return "Title is required.";
  if (title.length < TITLE_MIN_LEN) return `Title must be at least ${TITLE_MIN_LEN} characters.`;
  if (title.length > TITLE_MAX_LEN) return `Title cannot exceed ${TITLE_MAX_LEN} characters.`;
  if (!description) return "Description is required.";
  if (description.length < DESCRIPTION_MIN_LEN) return `Description must be at least ${DESCRIPTION_MIN_LEN} characters.`;
  if (description.length > DESCRIPTION_MAX_LEN) return `Description cannot exceed ${DESCRIPTION_MAX_LEN} characters.`;
  if (type !== "ytlink" && type !== "video") return "Type must be ytlink or video.";
  if (type === "ytlink" && !ytLink) return "YT link is required when type is ytlink.";
  if (type === "video" && !videoFile && !video && !hasExistingVideo) return "Video file is required when type is video.";
  if (ytLink.length > YT_LINK_MAX_LEN) return `YT link cannot exceed ${YT_LINK_MAX_LEN} characters.`;
  if (status !== "active" && status !== "inactive") return "Status must be active or inactive.";

  if (!editId) {
    if (!(thumbnailFile instanceof File)) return "Please upload a thumbnail image (JPEG, PNG, GIF, or WebP, max 5 MB).";
  } else if (!(thumbnailFile instanceof File) && !hasExistingThumbnail) {
    return "Upload a thumbnail image — this record has no thumbnail yet.";
  }

  if (thumbnailFile instanceof File) {
    if (!ALLOWED_IMAGE_TYPES.has(thumbnailFile.type)) return "Thumbnail must be a JPEG, PNG, GIF, or WebP image.";
    if (thumbnailFile.size > IMAGE_MAX_SIZE_BYTES) return "Thumbnail image must be 5 MB or smaller.";
  }
  if (videoFile instanceof File && !ALLOWED_VIDEO_TYPES.has(videoFile.type)) return "Video must be MP4, WebM, OGG, MOV, or M4V.";
  return "";
}

export function useHealthConcerns(adminToken, dispatch) {
  const [healthConcerns, setHealthConcerns] = useState([]);

  useEffect(() => {
    if (!adminToken) return;
    let cancelled = false;
    (async () => {
      try {
        const { healthConcerns: rowsData } = await adminListHealthConcerns(adminToken, { status: "active", limit: 200 });
        if (!cancelled) setHealthConcerns(Array.isArray(rowsData) ? rowsData : []);
      } catch (e) {
        if (e?.status === 401) {
          if (!cancelled) dispatch(logout());
          return;
        }
        if (!cancelled) {
          void Swal.fire({ icon: "error", title: "Load failed", text: e.message || "Failed to load health concerns." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminToken, dispatch]);

  return healthConcerns;
}

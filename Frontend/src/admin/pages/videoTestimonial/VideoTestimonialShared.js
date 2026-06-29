export const LIST_LIMIT = 10;
export const TYPE_OPTIONS = ["link", "video"];
export const NAME_MAX_LEN = 35;
export const YTLINK_MAX_LEN = 500;
export const SEARCH_MAX_LEN = 120;
export {
  IMAGE_MAX_SIZE_BYTES,
  VIDEO_MAX_SIZE_BYTES,
} from "../../../utils/mediaUploadValidation.js";

export function emptyForm() {
  return { name: "", type: "link", ytLink: "", video: "", profileImage: "", status: "active" };
}

/** Normalize API row (snake_case or camelCase media fields). */
export function testimonialFromApi(row) {
  if (!row) return emptyForm();
  return {
    name: row.name || "",
    type: row.type === "video" ? "video" : "link",
    ytLink: row.ytLink || "",
    video: row.video || "",
    profileImage: row.profileImage || "",
    status: row.status || "active",
  };
}

export function formatDateTime(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

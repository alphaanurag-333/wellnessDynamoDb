export const NAME_MAX_LEN = 35;
export const MESSAGE_MAX_LEN = 5000;
export const YTLINK_MAX_LEN = 500;
export const VIDEO_TYPE_OPTIONS = ["none", "link", "video"];
export {
  IMAGE_MAX_SIZE_BYTES,
  VIDEO_MAX_SIZE_BYTES,
} from "../../../utils/mediaUploadValidation.js";

export function emptyForm() {
  return {
    name: "",
    message: "",
    profileImage: "",
    type: "none",
    ytLink: "",
    video: "",
    status: "active",
  };
}

export function messageFromApi(row) {
  if (!row) return emptyForm();
  const type = String(row.type || "none").toLowerCase();
  return {
    name: row.name || "",
    message: row.message || "",
    profileImage: row.profileImage || "",
    type: VIDEO_TYPE_OPTIONS.includes(type) ? type : "none",
    ytLink: row.ytLink || "",
    video: row.video || "",
    status: row.status || "active",
  };
}

export function formatDateTime(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

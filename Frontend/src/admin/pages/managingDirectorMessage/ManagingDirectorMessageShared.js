export const TYPE_OPTIONS = ["link", "video"];
export const NAME_MAX_LEN = 35;
export const DESIGNATION_MAX_LEN = 80;
export const MESSAGE_MAX_LEN = 5000;
export const YTLINK_MAX_LEN = 500;
export {
  IMAGE_MAX_SIZE_BYTES,
  VIDEO_MAX_SIZE_BYTES,
} from "../../../utils/mediaUploadValidation.js";

export function emptyForm() {
  return {
    name: "",
    designation: "Managing Director",
    message: "",
    type: "link",
    ytLink: "",
    video: "",
    profileImage: "",
    status: "active",
  };
}

export function messageFromApi(row) {
  if (!row) return emptyForm();
  return {
    name: row.name || "",
    designation: row.designation || "Managing Director",
    message: row.message || "",
    type: row.type === "video" ? "video" : "link",
    ytLink: row.ytLink || "",
    video: row.video || "",
    profileImage: row.profileImage || "",
    status: row.status || "active",
  };
}

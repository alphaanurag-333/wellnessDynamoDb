export const NAME_MAX_LEN = 35;
export const MESSAGE_MAX_LEN = 5000;
export { IMAGE_MAX_SIZE_BYTES } from "../../../utils/mediaUploadValidation.js";

export function emptyForm() {
  return {
    name: "",
    message: "",
    profileImage: "",
    status: "active",
  };
}

export function messageFromApi(row) {
  if (!row) return emptyForm();
  return {
    name: row.name || "",
    message: row.message || "",
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

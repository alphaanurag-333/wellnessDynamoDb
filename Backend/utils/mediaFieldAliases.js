/** Dual-read / single-write helpers for legacy snake_case media attributes. */

function readProfileImageKey(item) {
  if (!item) return "";
  return String(item.profileImage || item.profile_image || "").trim();
}

function normalizeMediaItemFromStorage(item) {
  if (!item) return null;
  const row = { ...item };

  if (!row.profileImage && row.profile_image) {
    row.profileImage = row.profile_image;
  }
  delete row.profile_image;

  if (!row.videoSpecification && row.video_specification != null) {
    row.videoSpecification = row.video_specification;
  }
  delete row.video_specification;

  return row;
}

function parseProfileImageFromBody(body) {
  if (!body || typeof body !== "object") return undefined;
  const raw = body.profileImage ?? body.profile_image;
  if (raw === undefined || raw === null) return undefined;
  return raw;
}

function parseVideoSpecificationFromBody(body) {
  if (!body || typeof body !== "object") return undefined;
  if (body.videoSpecification !== undefined) return body.videoSpecification;
  if (body.video_specification !== undefined) return body.video_specification;
  return undefined;
}

function normalizeUpdateFieldName(key) {
  if (key === "profile_image") return "profileImage";
  if (key === "video_specification") return "videoSpecification";
  return key;
}

function legacyFieldsToRemoveOnUpdate(updates) {
  const remove = [];
  if (updates.profileImage !== undefined) remove.push("profile_image");
  if (updates.videoSpecification !== undefined) remove.push("video_specification");
  return remove;
}

module.exports = {
  readProfileImageKey,
  normalizeMediaItemFromStorage,
  parseProfileImageFromBody,
  parseVideoSpecificationFromBody,
  normalizeUpdateFieldName,
  legacyFieldsToRemoveOnUpdate,
};

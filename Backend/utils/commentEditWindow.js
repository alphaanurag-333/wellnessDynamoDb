const AppError = require("./AppError");

/** Matches the mobile app `COMMENT_EDIT_WINDOW_MS`. */
const COMMENT_EDIT_WINDOW_MS = 7_200_000;
const COMMENT_EDIT_WINDOW_EXPIRED_MESSAGE =
  "Comments can only be edited within 2 hours of posting.";

function isWithinCommentEditWindow(createdAt, now = new Date()) {
  const createdMs = new Date(createdAt || 0).getTime();
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(createdMs) || createdMs <= 0 || !Number.isFinite(nowMs)) return false;
  return nowMs - createdMs <= COMMENT_EDIT_WINDOW_MS;
}

function assertCommentEditable(createdAt, now = new Date()) {
  if (!isWithinCommentEditWindow(createdAt, now)) {
    throw new AppError(COMMENT_EDIT_WINDOW_EXPIRED_MESSAGE, 403);
  }
}

module.exports = {
  COMMENT_EDIT_WINDOW_MS,
  COMMENT_EDIT_WINDOW_EXPIRED_MESSAGE,
  isWithinCommentEditWindow,
  assertCommentEditable,
};

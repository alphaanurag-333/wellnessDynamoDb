const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { photoAnglesAllApproved } = require("../utils/paidOnboardingHelpers");

function shouldNotifyProgressPhotoReview({ action, angle, photoAfterReview }) {
  const allAnglesApproved = action === "approved"
    && angle !== "weight"
    && photoAnglesAllApproved(photoAfterReview);
  return action === "rejected"
    || angle === "weight"
    || allAnglesApproved;
}

function reviewedPhoto(statuses) {
  return {
    frontPicKey: "front",
    rightPicKey: "right",
    leftPicKey: "left",
    frontReviewStatus: statuses.front,
    rightReviewStatus: statuses.right,
    leftReviewStatus: statuses.left,
  };
}

describe("progress photo review notifications", () => {
  it("does not notify on partial 180° approval", () => {
    assert.equal(
      shouldNotifyProgressPhotoReview({
        action: "approved",
        angle: "front",
        photoAfterReview: reviewedPhoto({ front: "approved", right: "pending", left: "pending" }),
      }),
      false,
    );
    assert.equal(
      shouldNotifyProgressPhotoReview({
        action: "approved",
        angle: "right",
        photoAfterReview: reviewedPhoto({ front: "approved", right: "approved", left: "pending" }),
      }),
      false,
    );
  });

  it("notifies once when the third 180° angle is approved", () => {
    assert.equal(
      shouldNotifyProgressPhotoReview({
        action: "approved",
        angle: "left",
        photoAfterReview: reviewedPhoto({ front: "approved", right: "approved", left: "approved" }),
      }),
      true,
    );
  });

  it("still notifies on rejection and weight approval", () => {
    assert.equal(
      shouldNotifyProgressPhotoReview({
        action: "rejected",
        angle: "front",
        photoAfterReview: reviewedPhoto({ front: "rejected", right: "rejected", left: "rejected" }),
      }),
      true,
    );
    assert.equal(
      shouldNotifyProgressPhotoReview({
        action: "approved",
        angle: "weight",
        photoAfterReview: { weightPicKey: "w", weightReviewStatus: "approved" },
      }),
      true,
    );
  });
});

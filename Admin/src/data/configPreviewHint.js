import { CONFIG_LEGAL_PUBLISH_SLUGS } from "../api/legalPageApi.js";
import {
  COMMON_LEGAL_GUIDELINES_ID,
  COMMON_LEGAL_PRIVACY_ID,
  COMMON_LEGAL_TOS_ID,
} from "./configsData.js";

const STATIC_PAGE_PREVIEW_HINTS = {
  [COMMON_LEGAL_TOS_ID]: "Edit the copy, then open Preview",
  [COMMON_LEGAL_PRIVACY_ID]: "Edit the copy, then open Preview",
  [COMMON_LEGAL_GUIDELINES_ID]: "Edit the copy, then open Preview",
  "app-tos": "Edit the copy, then open Preview",
  "web-fs-tos": "Edit the copy, then open Preview",
  "web-fs-privacy": "Edit the copy, then open Preview",
  "web-fs-guidelines": "Edit the copy, then open Preview",
  "app-dpa": "Edit the copy, then open Preview",
  "app-terms-of-service": "Edit the copy, then open Preview",
  "app-privacy-policy": "Edit the copy, then open Preview",
  "app-terms-conditions": "Edit the copy, then open Preview",
  "app-community-guidelines": "Edit the copy, then open Preview",
  "web-fs-contact": "Edit the details, then open Preview",
  "web-fs-text": "Edit the copy, then open Preview",
  "common-about": "Edit the copy, then open Preview",
};

/** Preview is only available on static/legal page configs. */
export function previewHintForItem(item) {
  if (!item?.id || !(item.id in CONFIG_LEGAL_PUBLISH_SLUGS)) {
    return "";
  }
  return STATIC_PAGE_PREVIEW_HINTS[item.id] || "Open Preview before you publish";
}

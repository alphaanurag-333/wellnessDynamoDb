import { CONFIG_LEGAL_PUBLISH_SLUGS } from "../api/legalPageApi.js";

const STATIC_PAGE_PREVIEW_HINTS = {
  "app-tos": "Edit the copy, then open Preview",
  "web-fs-tos": "Edit the copy, then open Preview",
  "web-fs-privacy": "Edit the copy, then open Preview",
  "web-fs-guidelines": "Edit the copy, then open Preview",
  "app-dpa": "Edit the copy, then open Preview",
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

import {
  RECIPE_DESCRIPTION_MAX_LEN,
  RECIPE_TITLE_MAX_LEN,
  recipeCategoryLabel,
} from "./recipesConfigData.js";

export const YOGA_PAGE_SIZE = 20;
export const YOGA_CATEGORY_SLUG = "yoga-category";
export const YOGA_TITLE_MAX_LEN = RECIPE_TITLE_MAX_LEN;
export const YOGA_DESCRIPTION_MAX_LEN = RECIPE_DESCRIPTION_MAX_LEN;

export const YOGA_CATEGORIES = [
  "Morning flow",
  "Restorative",
  "Pranayam",
  "Core & strength",
  "Back & neck relief",
  "Sleep wind-down",
  "Beginner",
];

export const YOGA_EDITOR = {
  appOn: true,
  webOn: true,
};

export const YOGA_ITEMS = [];

export function mapYoga(row, categoryOptions = []) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const apiType = String(row.type || "ytlink").toLowerCase() === "video" ? "video" : "ytlink";
  const category = String(row.category || "").trim();
  return {
    id,
    title: String(row.title || "").trim(),
    category,
    categoryLabel: recipeCategoryLabel(category, categoryOptions),
    type: apiType === "video" ? "VIDEO" : "YT",
    apiType,
    duration: apiType === "video" ? "Video" : "YouTube",
    description: String(row.description || "").trim(),
    live: row.status !== "inactive",
    status: row.status === "inactive" ? "inactive" : "active",
    webVisible: row.webVisible !== false,
    appVisible: row.appVisible !== false,
    cover: Boolean(row.thumbnail),
    thumbnail: row.thumbnail || "",
    videoLink: String(row.ytLink || "").trim(),
    video: row.video || "",
    order: Number.isFinite(Number(row.order)) ? Number(row.order) : 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

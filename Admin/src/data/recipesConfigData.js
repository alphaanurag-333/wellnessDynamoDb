export const RECIPE_PAGE_SIZE = 20;
export const RECIPE_CATEGORY_SLUG = "recipe-category";
export const RECIPE_IMAGE_MAX_MB = 25;
export const RECIPE_VIDEO_MAX_MB = 25;
export const RECIPE_IMAGE_MAX_BYTES = RECIPE_IMAGE_MAX_MB * 1024 * 1024;
export const RECIPE_VIDEO_MAX_BYTES = RECIPE_VIDEO_MAX_MB * 1024 * 1024;

export const RECIPE_CATEGORIES = [
  "Fat loss",
  "Protein rich",
  "Diabetes friendly",
  "Gut reset",
  "Low GI",
  "PCOD friendly",
  "Thyroid friendly",
  "High fibre",
];

export const RECIPES_EDITOR = {
  appOn: true,
  webOn: true,
};

export const RECIPE_ITEMS = [];

export const RECIPE_GALLERY_OWNERS = ["All owners", "Anita Rao", "Ishita Sen", "Rohan Das", "Priya Nair", "Admin"];

export const RECIPE_GALLERY = [];

export function emptyRecipeDraft(category = "") {
  return {
    title: "",
    category,
    description: "",
    videoLink: "",
    cover: false,
    video: false,
    coverFile: null,
    coverPreview: "",
    videoFile: null,
    videoName: "",
  };
}

export function mapDropdownCategoryOptions(list) {
  return (Array.isArray(list?.options) ? list.options : [])
    .filter((row) => row && row.on !== false)
    .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
    .map((row) => ({
      id: row.id,
      value: String(row.value || row.label || "").trim(),
      label: String(row.label || row.value || "").trim(),
    }))
    .filter((row) => row.value && row.label);
}

export function recipeCategoryLabel(value, options = []) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = options.find((row) => row.value === raw || row.label === raw);
  return match?.label || raw;
}

export function mapHealthRecipe(row, categoryOptions = []) {
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
    cover: Boolean(row.thumbnail),
    thumbnail: row.thumbnail || "",
    videoLink: String(row.ytLink || "").trim(),
    video: row.video || "",
    videoSpecification: Array.isArray(row.videoSpecification) ? row.videoSpecification : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function withCategoryLabels(items, categoryOptions) {
  return (items || []).map((row) => ({
    ...row,
    categoryLabel: recipeCategoryLabel(row.category, categoryOptions),
  }));
}

export function validateRecipeImage(file) {
  if (!(file instanceof File)) return "Choose a cover image";
  if (!String(file.type || "").startsWith("image/")) return "Cover must be an image";
  if (file.size > RECIPE_IMAGE_MAX_BYTES) return `Cover image must be ${RECIPE_IMAGE_MAX_MB} MB or smaller`;
  return "";
}

export function validateRecipeVideo(file) {
  if (!(file instanceof File)) return "Choose a video file";
  if (!String(file.type || "").startsWith("video/")) return "Upload a video file";
  if (file.size > RECIPE_VIDEO_MAX_BYTES) return `Video must be ${RECIPE_VIDEO_MAX_MB} MB or smaller`;
  return "";
}

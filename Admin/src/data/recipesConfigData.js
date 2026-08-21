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

export function categorySlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function categoryTitle(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/[_-]/.test(raw) && /[A-Z]/.test(raw)) return raw;
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function findCategoryOption(value, options = []) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const slug = categorySlug(raw);
  return (
    options.find((row) => row.value === raw || row.label === raw) ||
    options.find((row) => categorySlug(row.value) === slug || categorySlug(row.label) === slug) ||
    null
  );
}

export function recipeCategoryLabel(value, options = []) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return findCategoryOption(raw, options)?.label || categoryTitle(raw);
}

export function resolveCategorySelectValue(value, options = []) {
  const match = findCategoryOption(value, options);
  return match?.value || String(value || "");
}

export function persistRecipeCategory(value, options = []) {
  const match = findCategoryOption(value, options);
  const source = match?.label || match?.value || value;
  return categorySlug(source) || String(value || "").trim();
}

export function parseRecipeSpecs(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }
  if (typeof value !== "string") return [];
  const raw = value.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parseRecipeSpecs(parsed);
  } catch {
    /* comma / newline separated */
  }
  return raw.split(/\r?\n|,/).map((entry) => entry.trim()).filter(Boolean);
}

export function youtubeEmbedUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (raw.includes("/embed/")) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.replace(/^\//, "").split("/")[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch {
    return "";
  }
  return "";
}

export function formatRecipeDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function emptyRecipeDraft(category = "") {
  return {
    title: "",
    category,
    description: "",
    mediaMode: "ytlink",
    videoLink: "",
    videoSpecification: [],
    cover: false,
    video: false,
    coverFile: null,
    coverPreview: "",
    videoFile: null,
    videoPreview: "",
    videoName: "",
  };
}

export function mapDropdownCategoryOptions(list) {
  return (Array.isArray(list?.options) ? list.options : [])
    .filter((row) => row && row.on !== false)
    .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
    .map((row) => {
      const label = String(row.label || row.value || "").trim();
      const value = String(row.value || "").trim() || categorySlug(label);
      return {
        id: row.id,
        value,
        label: label || categoryTitle(value),
      };
    })
    .filter((row) => row.value && row.label);
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
    mediaMode: apiType,
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
    videoSpecification: parseRecipeSpecs(row.videoSpecification),
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

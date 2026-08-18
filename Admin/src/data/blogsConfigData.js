import { formatRecipeDate } from "./recipesConfigData.js";

export const BLOGS_EDITOR = {
  appOn: true,
  webOn: true,
};

export const BLOG_POSTS = [];

export const BLOG_GALLERY_OWNERS = ["All owners", "Admin"];

export const BLOG_GALLERY = [];

export function mapBlogConfig(row) {
  if (!row) return null;
  return {
    id: row.id || row._id || "blog-config",
    appOn: row.appOn !== false,
    webOn: row.webOn !== false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function editorFromBlogConfig(row, fallback = BLOGS_EDITOR) {
  const mapped = mapBlogConfig(row);
  if (!mapped) return { ...fallback };
  return {
    ...fallback,
    appOn: mapped.appOn,
    webOn: mapped.webOn,
    updatedAt: mapped.updatedAt,
  };
}

export function mapBlogPost(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  return {
    id,
    title: String(row.title || "").trim(),
    description: String(row.description || "").trim(),
    live: row.status !== "inactive",
    status: row.status === "inactive" ? "inactive" : "active",
    cover: Boolean(row.coverImage),
    coverImage: row.coverImage || "",
    sortOrder: Number(row.sortOrder) || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapBlogMedia(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const sizeLabel = row.fileSizeLabel || row.fileSize || "";
  return {
    id,
    title: String(row.title || "").trim() || "Blog cover",
    owner: String(row.owner || "Admin").trim() || "Admin",
    date: formatRecipeDate(row.updatedAt || row.createdAt),
    size: sizeLabel,
    versions: Number(row.versions) || 1,
    live: row.status === "active",
    status: row.status === "active" ? "active" : "inactive",
    image: row.image || "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function galleryOwnersFromMedia(items = []) {
  const owners = new Set(["Admin"]);
  for (const entry of items) {
    if (entry?.owner) owners.add(entry.owner);
  }
  return ["All owners", ...Array.from(owners).sort((a, b) => a.localeCompare(b))];
}

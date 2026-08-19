import api, { normalizeApiError } from "../api.js";
import { liveVersionText } from "../data/privacyConfigData.js";

function pagesBase() {
  return "/admin/misc/pages";
}

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function sectionsFromBlocks(blocks = []) {
  return (Array.isArray(blocks) ? blocks : []).map((block) => ({
    id: String(block.id || "").trim(),
    title: String(block.title || "").trim(),
    shown: block.shown !== false,
    body: String(
      (Array.isArray(block.versions) && block.versions.length
        ? liveVersionText(block)
        : block.body) || ""
    ).trim(),
  })).filter((row) => row.id);
}

export function blocksFromSections(sections = []) {
  return (Array.isArray(sections) ? sections : []).map((section) => ({
    id: String(section.id || "").trim(),
    title: String(section.title || "").trim(),
    shown: section.shown !== false,
    webVersion: 1,
    appVersion: 1,
    versions: [
      {
        n: 1,
        date: todayLabel(),
        author: "Admin",
        text: String(section.body || "").trim(),
      },
    ],
  })).filter((row) => row.id && row.title);
}

function cloneBlocks(blocks = []) {
  return (Array.isArray(blocks) ? blocks : []).map((block) => ({
    ...block,
    assets: block.assets ? { ...block.assets } : block.assets,
    versions: Array.isArray(block.versions)
      ? block.versions.map((version) => ({ ...version }))
      : [],
  }));
}

export function mapLegalPage(page = {}, fallbackBlocks = []) {
  const blocks = Array.isArray(page.blocks) && page.blocks.length
    ? cloneBlocks(page.blocks)
    : cloneBlocks(fallbackBlocks);
  return {
    id: page.id || "",
    slug: page.slug || "",
    title: String(page.title || "").trim(),
    status: page.status || "active",
    content: page.content || "",
    blocks,
  };
}

export async function getLegalPage(slug, fallbackBlocks = []) {
  try {
    const { data } = await api.get(`${pagesBase()}/by-slug/${encodeURIComponent(slug)}`);
    return mapLegalPage(data?.data || {}, fallbackBlocks);
  } catch (error) {
    if (error?.response?.status === 404) {
      return mapLegalPage({ slug, title: "", blocks: fallbackBlocks }, fallbackBlocks);
    }
    normalizeApiError(error);
  }
}

export async function saveLegalPage(slug, { title, blocks, status = "active" }) {
  try {
    const { data } = await api.put(`${pagesBase()}/by-slug/${encodeURIComponent(slug)}`, {
      slug,
      title,
      blocks,
      status,
    });
    return mapLegalPage(data?.data || {}, blocks);
  } catch (error) {
    normalizeApiError(error);
  }
}

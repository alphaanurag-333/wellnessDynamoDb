import api, { normalizeApiError } from "../api.js";
import { liveVersionText } from "../data/privacyConfigData.js";
import {
  COMMON_LEGAL_GUIDELINES_ID,
  COMMON_LEGAL_PRIVACY_ID,
  COMMON_LEGAL_TOS_ID,
} from "../data/configsData.js";

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

export function blocksFromSections(sections = [], previousBlocks = []) {
  const prevById = new Map(
    (Array.isArray(previousBlocks) ? previousBlocks : [])
      .filter((row) => row && row.id)
      .map((row) => [String(row.id), row]),
  );

  return (Array.isArray(sections) ? sections : []).map((section) => {
    const id = String(section.id || "").trim();
    const title = String(section.title || "").trim();
    const body = String(section.body || "").trim();
    const prev = prevById.get(id);
    const versions = Array.isArray(prev?.versions)
      ? prev.versions.map((version) => ({ ...version }))
      : [];

    if (!versions.length) {
      versions.push({
        n: 1,
        date: todayLabel(),
        author: "Admin",
        text: body,
      });
    } else {
      // Panel edits apply to both surfaces so website + app stay in sync.
      const webN = Number(prev?.webVersion) || versions[0].n;
      const appN = Number(prev?.appVersion) || versions[0].n;
      const touch = new Set([webN, appN]);
      for (const version of versions) {
        if (touch.has(Number(version.n))) {
          version.text = body;
          version.date = todayLabel();
          version.author = "Admin";
        }
      }
    }

    const versionNs = new Set(versions.map((entry) => Number(entry.n)));
    const webVersion = versionNs.has(Number(prev?.webVersion))
      ? Number(prev.webVersion)
      : versions[0].n;
    const appVersion = versionNs.has(Number(prev?.appVersion))
      ? Number(prev.appVersion)
      : versions[0].n;

    return {
      id,
      title,
      shown: section.shown !== false,
      webVersion,
      appVersion,
      assets: prev?.assets,
      versions,
    };
  }).filter((row) => row.id && row.title);
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
    icon: String(page.icon || "").trim(),
    blocks,
  };
}

/** Config detail IDs → static page slug(s) published together. */
export const CONFIG_LEGAL_PUBLISH_SLUGS = {
  [COMMON_LEGAL_TOS_ID]: ["terms-and-conditions"],
  [COMMON_LEGAL_PRIVACY_ID]: ["privacy-policy"],
  [COMMON_LEGAL_GUIDELINES_ID]: ["community-guideline"],
  "app-tos": ["terms-and-conditions"],
  "web-fs-tos": ["terms-and-conditions"],
  "web-fs-privacy": ["privacy-policy"],
  "web-fs-guidelines": ["community-guideline"],
  "app-dpa": ["app-dpa"],
  "app-terms-of-service": ["app-terms-of-service"],
  "app-privacy-policy": ["app-privacy-policy"],
  "app-terms-conditions": ["app-terms-conditions"],
  "app-community-guidelines": ["app-community-guidelines"],
  "web-fs-contact": ["contact-us"],
  "web-fs-text": ["footer-text"],
  "common-about": ["about-us", "our-mission", "our-vision", "our-goal"],
};

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

export async function saveLegalPage(slug, { title, blocks, status = "active", icon }) {
  try {
    const payload = {
      slug,
      title,
      blocks,
      status,
    };
    if (icon !== undefined) payload.icon = icon;
    const { data } = await api.put(`${pagesBase()}/by-slug/${encodeURIComponent(slug)}`, payload);
    return mapLegalPage(data?.data || {}, blocks);
  } catch (error) {
    normalizeApiError(error);
  }
}

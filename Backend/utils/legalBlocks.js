const SLUG_ALIASES = {
  "community-guidelines": ["community-guideline"],
  "community-guideline": ["community-guidelines"],
  "privacy": ["privacy-policy"],
  "privacy-policy": ["privacy"],
  "terms": ["terms-and-conditions", "terms-of-service"],
  "terms-of-service": ["terms-and-conditions", "terms"],
  "terms-and-conditions": ["terms-of-service", "terms"],
  "app-tos": ["terms-and-conditions"],
  "app-terms-and-conditions": ["terms-and-conditions"],
  "app-dpa": ["data-processing-agreement", "dpa"],
  "data-processing-agreement": ["app-dpa", "dpa"],
  "dpa": ["app-dpa", "data-processing-agreement"],
  "app-privacy": ["app-privacy-policy"],
  "app-privacy-policy": ["app-privacy"],
  "app-terms-conditions": ["app-mobile-terms"],
  "app-mobile-terms": ["app-terms-conditions"],
  "app-community-guidelines": ["app-community-guideline"],
  "app-community-guideline": ["app-community-guidelines"],
  "app-compliance": ["app-compliance-notice"],
  "app-compliance-notice": ["app-compliance"],
};

function slugifyBlockId(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function looksLikeHtml(value) {
  return /<[a-z][\s\S]*>/i.test(String(value || ""));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripTags(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function defaultLegalAssets() {
  return {
    webIcon: { kind: "icon", surface: "web", format: "SVG", size: "48×48", uploaded: false, tone: "web" },
    appIcon: { kind: "icon", surface: "app", format: "PNG", size: "96×96", uploaded: false, tone: "app" },
    appPhoto: { kind: "photo", surface: "app", format: "JPG", size: "1200×800", uploaded: false, tone: "app" },
  };
}

function normalizeLegalAsset(asset, fallback) {
  const base = fallback && typeof fallback === "object" ? fallback : {};
  const raw = asset && typeof asset === "object" ? asset : {};
  return {
    kind: String(raw.kind || base.kind || "icon").trim() || "icon",
    surface: String(raw.surface || base.surface || "web").trim() || "web",
    format: String(raw.format || base.format || "").trim(),
    size: String(raw.size || base.size || "").trim(),
    uploaded: Boolean(raw.uploaded),
    tone: String(raw.tone || base.tone || raw.surface || "web").trim() || "web",
  };
}

function stripEditorArtifacts(html) {
  return String(html || "")
    .replace(/\s*data-list-item-id="[^"]*"/gi, "")
    .trim();
}

function normalizeLegalVersion(row, index) {
  if (!row || typeof row !== "object") return null;
  const n = Number(row.n || index + 1);
  const text = stripEditorArtifacts(row.text ?? "");
  return {
    n: Number.isFinite(n) && n > 0 ? Math.floor(n) : index + 1,
    date: String(row.date || "").trim() || todayLabel(),
    author: String(row.author || "Admin").trim() || "Admin",
    text,
  };
}

function makeLegalBlock(id, title, text) {
  const cleanId = slugifyBlockId(id || title) || `section-${Date.now()}`;
  const cleanTitle = String(title || cleanId).trim() || cleanId;
  return {
    id: cleanId,
    title: cleanTitle,
    shown: true,
    webVersion: 1,
    appVersion: 1,
    assets: defaultLegalAssets(),
    versions: [
      {
        n: 1,
        date: todayLabel(),
        author: "Admin",
        text: String(text || "").trim(),
      },
    ],
  };
}

function normalizeLegalBlock(row, index) {
  if (!row || typeof row !== "object") return null;
  const id = slugifyBlockId(row.id || row.title) || `section-${index + 1}`;
  const title = String(row.title || id).trim() || id;
  const versions = Array.isArray(row.versions)
    ? row.versions.map(normalizeLegalVersion).filter(Boolean)
    : [];
  if (!versions.length) {
    const text = String(row.text || row.content || "").trim();
    versions.push({
      n: 1,
      date: todayLabel(),
      author: "Admin",
      text,
    });
  }
  const versionNs = new Set(versions.map((entry) => entry.n));
  const webVersion = Number(row.webVersion);
  const appVersion = Number(row.appVersion);
  const firstN = versions[0].n;
  const assets = defaultLegalAssets();
  if (row.assets && typeof row.assets === "object") {
    for (const key of Object.keys(assets)) {
      assets[key] = normalizeLegalAsset(row.assets[key], assets[key]);
    }
  }
  return {
    id,
    title,
    shown: row.shown !== false,
    webVersion: versionNs.has(webVersion) ? webVersion : firstN,
    appVersion: versionNs.has(appVersion) ? appVersion : firstN,
    assets,
    versions,
  };
}

function parseJsonIfNeeded(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeLegalBlocks(value) {
  const parsed = parseJsonIfNeeded(value);
  if (!Array.isArray(parsed)) return [];
  const seen = new Set();
  return parsed
    .map((row, index) => normalizeLegalBlock(row, index))
    .filter(Boolean)
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
}

function liveBlockText(block, surface = "web") {
  const n = surface === "app" ? block.appVersion : block.webVersion;
  const version = (block.versions || []).find((entry) => entry.n === n) || block.versions?.[0];
  return String(version?.text || "").trim();
}

function compileLegalBlocksToHtml(blocks, surface = "web") {
  const resolvedSurface = surface === "app" ? "app" : "web";
  return normalizeLegalBlocks(blocks)
    .filter((block) => block.shown)
    .map((block) => {
      const text = liveBlockText(block, resolvedSurface);
      const body = looksLikeHtml(text) ? text : text ? `<p>${escapeHtml(text)}</p>` : "";
      if (!body) return "";
      if (block.id === "intro" || block.id === "copyright" || block.id === "secondary") {
        return body;
      }
      return `<h2>${escapeHtml(block.title)}</h2>\n${body}`;
    })
    .filter(Boolean)
    .join("\n");
}

function htmlToLegalBlocks(html, fallbackTitle = "Introduction") {
  const trimmed = String(html || "").trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/<h2\b[^>]*>/i);
  const blocks = [];
  const intro = String(parts[0] || "").trim();
  if (intro) {
    blocks.push(makeLegalBlock("intro", fallbackTitle || "Introduction", intro));
  }
  for (let index = 1; index < parts.length; index += 1) {
    const chunk = parts[index];
    const closeAt = chunk.search(/<\/h2>/i);
    let title = "";
    let body = chunk;
    if (closeAt >= 0) {
      title = stripTags(chunk.slice(0, closeAt));
      body = chunk.slice(closeAt).replace(/<\/h2>/i, "").trim();
    }
    const cleanTitle = title || `Section ${index}`;
    blocks.push(makeLegalBlock(slugifyBlockId(cleanTitle) || `section-${index}`, cleanTitle, body));
  }
  return blocks;
}

function contentIsRicherThanBlocks(html, blocks) {
  const parsed = htmlToLegalBlocks(html);
  if (!parsed.length) return false;
  if (!blocks.length) return true;
  const htmlPlain = stripTags(html);
  const blocksPlain = blocks
    .map((block) => stripTags(liveBlockText(block)))
    .join(" ");
  const headingCount = (String(html).match(/<h2\b/gi) || []).length;
  return headingCount > blocks.length
    || htmlPlain.length > Math.max(blocksPlain.length * 2, 400);
}

function resolveLegalBlocks(page, fallbackBlocks = []) {
  const stored = normalizeLegalBlocks(page?.blocks);
  const parsed = htmlToLegalBlocks(page?.content, page?.title);
  if (parsed.length && contentIsRicherThanBlocks(page?.content, stored)) {
    return parsed;
  }
  if (stored.length) return stored;
  if (parsed.length) return parsed;
  return normalizeLegalBlocks(fallbackBlocks);
}

function slugCandidates(slug) {
  const clean = slugifyBlockId(slug) || String(slug || "").trim();
  if (!clean) return [];
  const extras = SLUG_ALIASES[clean] || [];
  return [clean, ...extras].filter((value, index, all) => all.indexOf(value) === index);
}

module.exports = {
  compileLegalBlocksToHtml,
  htmlToLegalBlocks,
  liveBlockText,
  makeLegalBlock,
  normalizeLegalBlocks,
  resolveLegalBlocks,
  slugCandidates,
  slugifyBlockId,
};

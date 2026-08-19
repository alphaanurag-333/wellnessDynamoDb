import api, { normalizeApiError } from "../../api.js";

export async function getPublicAppConfig() {
  try {
    const { data: body } = await api.get("/public/app-config");
    return body;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchClientTestimonials(params = {}) {
  try {
    const { data } = await api.get("/public/misc/client-testimonials", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchProgramTestimonials(params = {}) {
  try {
    const { data } = await api.get("/public/misc/program-testimonials", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchRealPeopleTestimonials(params = {}) {
  try {
    const { data } = await api.get("/public/misc/real-people-testimonials", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchVideoTestimonials(params = {}) {
  try {
    const { data } = await api.get("/public/misc/video-testimonials", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchCofounderMessage() {
  try {
    const { data } = await api.get("/public/misc/cofounder-message");
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchWellnessCoaches(params = {}) {
  try {
    const { data } = await api.get("/public/misc/wellness-coaches", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchAssistantWellnessCoaches(params = {}) {
  try {
    const { data } = await api.get("/public/misc/assistant-wellness-coaches", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchLeadershipNotes(params = {}) {
  try {
    const { data } = await api.get("/public/misc/leadership-notes", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchWellnessTeamNotes(params = {}) {
  try {
    const { data } = await api.get("/public/misc/wellness-team-notes", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchHealthRecipes(params = {}) {
  try {
    const { data } = await api.get("/public/misc/health-recipes", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchActiveBanners(params = {}) {
  try {
    const { data } = await api.get("/public/misc/banners", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchTransformations(params = {}) {
  try {
    const { data } = await api.get("/public/misc/transformations", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchHealthConcerns(params = {}) {
  try {
    const { data } = await api.get("/public/misc/health-concerns", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchBirthdayPosts(params = {}) {
  try {
    const { data } = await api.get("/public/misc/birthday-posts", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchMonthlyChampions(params = {}) {
  try {
    const { data } = await api.get("/public/misc/monthly-champions", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function submitContactInquiry(payload) {
  try {
    const { data } = await api.post("/public/misc/contact-inquiries", payload);
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchStaticPageBySlug(slug) {
  try {
    const { data } = await api.get(`/public/misc/pages/${encodeURIComponent(slug)}`);
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchStaticPageBySlugSafe(slug) {
  try {
    const data = await fetchStaticPageBySlug(slug);
    return data?.page || null;
  } catch {
    return null;
  }
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitHtmlAroundFirstHeading(html) {
  const source = String(html || "").trim();
  const match = source.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/i);
  if (!match) {
    return { heading: "", intro: source, rest: "" };
  }
  const heading = stripHtml(match[0].replace(/<\/?h2[^>]*>/gi, " "));
  const after = source.slice(source.indexOf(match[0]) + match[0].length);
  const nextAt = after.search(/<h2\b/i);
  if (nextAt < 0) {
    return { heading, intro: after.trim(), rest: "" };
  }
  return {
    heading,
    intro: after.slice(0, nextAt).trim(),
    rest: after.slice(nextAt).trim(),
  };
}

export function staticPageCopy(page, fallback = {}) {
  return pillarCopyFromStaticPage(page, fallback);
}

function liveBlockText(block) {
  if (!block || typeof block !== "object") return "";
  const versions = Array.isArray(block.versions) ? block.versions : [];
  const n = Number(block.webVersion);
  const version = versions.find((entry) => Number(entry?.n) === n) || versions[0];
  return String(version?.text || block.text || block.content || "").trim();
}

function shownBlocks(page) {
  return (Array.isArray(page?.blocks) ? page.blocks : []).filter(
    (block) => block && block.shown !== false
  );
}

export function htmlFromStaticPage(page) {
  if (!page) return "";
  const compiled = shownBlocks(page)
    .map((block) => {
      const text = liveBlockText(block);
      if (!text) return "";
      if (block.id === "intro" || block.id === "copyright" || block.id === "secondary") {
        return text;
      }
      const alreadyHasHeading = /<h2\b/i.test(text);
      if (alreadyHasHeading) return text;
      const title = String(block.title || "").trim();
      return title ? `<h2>${title}</h2>\n${text}` : text;
    })
    .filter(Boolean)
    .join("\n");
  if (stripHtml(compiled)) return compiled;
  return String(page.content || "").trim();
}

export function footerCopyFromStaticPage(page) {
  if (!page) {
    return { copyright: "", credit: "" };
  }
  const blocks = shownBlocks(page);
  const byId = (id) => blocks.find((block) => block.id === id);
  const copyright = stripHtml(liveBlockText(byId("copyright")) || "");
  const credit = stripHtml(liveBlockText(byId("secondary")) || "");
  if (copyright || credit) {
    return { copyright, credit };
  }
  const parts = stripHtml(page.content || "")
    .split("||")
    .flatMap((part) => String(part).split(/\n+/))
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    copyright: parts.find((part) => /©|copyright/i.test(part)) || parts[0] || "",
    credit: parts.find((part) => part !== parts[0]) || "",
  };
}

export function pillarCopyFromStaticPage(page, fallback = {}) {
  if (!page) {
    return {
      title: fallback.title || "",
      headTitle: fallback.headTitle || "",
      description: fallback.description || "",
      html: fallback.html || "",
    };
  }

  const title = String(page.title || "").trim() || fallback.title || "";
  const shown = (Array.isArray(page.blocks) ? page.blocks : []).filter((block) => block && block.shown !== false);
  const headlineBlock = shown.find((block) => block.id === "headline")
    || shown.find((block) => block.id && block.id !== "intro");
  const introBlock = shown.find((block) => block.id === "intro");

  let headTitle = "";
  let bodyHtml = "";

  if (headlineBlock && headlineBlock.id !== "intro") {
    headTitle = String(headlineBlock.title || "").trim();
    bodyHtml = liveBlockText(headlineBlock);
    if (headTitle && title && headTitle.toLowerCase() === title.toLowerCase()) {
      headTitle = "";
    }
  } else if (introBlock) {
    const parts = splitHtmlAroundFirstHeading(liveBlockText(introBlock));
    headTitle = parts.heading;
    bodyHtml = parts.intro || liveBlockText(introBlock);
  }

  if (!headTitle || !stripHtml(bodyHtml)) {
    const html = String(page.content || "").trim();
    const parts = splitHtmlAroundFirstHeading(html);
    if (!headTitle) {
      const heading = parts.heading || "";
      headTitle = heading && heading.toLowerCase() !== title.toLowerCase() ? heading : "";
    }
    if (!stripHtml(bodyHtml)) {
      bodyHtml = parts.heading ? parts.intro : html;
    }
  }

  if (headTitle && title && headTitle.toLowerCase() === title.toLowerCase()) {
    headTitle = "";
  }

  return {
    title: title || fallback.title,
    headTitle: headTitle || fallback.headTitle || "",
    html: bodyHtml || fallback.html || "",
    description: stripHtml(bodyHtml) || fallback.description || "",
  };
}

export function heroCopyFromStaticPage(page, fallback = {}) {
  const pageTitle = String(page?.title || "").trim();
  const html = String(page?.content || "").trim();
  const parts = splitHtmlAroundFirstHeading(html);
  const genericTitle = !pageTitle || /^about us$/i.test(pageTitle);
  if (genericTitle) {
    return {
      title: fallback.title || parts.heading || "",
      bodyHtml: fallback.body || parts.intro || html || "",
      rest: parts.rest || "",
    };
  }
  const headingMatchesTitle =
    Boolean(parts.heading)
    && parts.heading.toLowerCase() === pageTitle.toLowerCase();
  const bodyHtml = headingMatchesTitle
    ? (parts.intro || "")
    : (html || fallback.body || "");
  return {
    title: pageTitle,
    bodyHtml: bodyHtml || fallback.body || "",
    rest: headingMatchesTitle ? (parts.rest || "") : "",
  };
}

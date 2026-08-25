import api, { normalizeApiError } from "../../api.js";

export async function getPublicAppConfig() {
  try {
    const { data: body } = await api.get("/public/app-config");
    return body;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchFaqs(params = {}) {
  try {
    const { data } = await api.get("/public/misc/faqs", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchHealthDisorders(params = {}) {
  try {
    const { data } = await api.get("/public/misc/health-disorders", { params });
    return data;
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

export async function fetchYoga(params = {}) {
  try {
    const { data } = await api.get("/public/misc/yoga", { params });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchConfigDropdown(slug) {
  try {
    const { data } = await api.get(
      `/public/misc/config-dropdowns/${encodeURIComponent(slug)}`
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchConfigDropdownOptions(slug) {
  try {
    const data = await fetchConfigDropdown(slug);
    const options = Array.isArray(data?.list?.options) ? data.list.options : [];
    return options
      .filter((row) => row && row.on !== false)
      .map((row) => ({
        value: String(row.value || "").trim(),
        label: String(row.label || row.value || "").trim(),
        sortOrder: Number(row.sortOrder) || 0,
      }))
      .filter((row) => row.value || row.label);
  } catch {
    return [];
  }
}

/** Section App/Web kill switch. Missing config → treat as enabled. */
export async function fetchSectionSurfaceConfig(section) {
  try {
    const { data } = await api.get(
      `/public/misc/section-surface-config/${encodeURIComponent(section)}`
    );
    return data?.data || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function isSectionLiveOnWeb(section) {
  try {
    const config = await fetchSectionSurfaceConfig(section);
    if (!config) return true;
    return config.webOn !== false;
  } catch {
    return true;
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

export function htmlFromStaticPage(page) {
  return String(page?.content || "").trim();
}

export function footerCopyFromStaticPage(page) {
  if (!page) {
    return { copyright: "", credit: "" };
  }
  const html = String(page.content || "").trim();
  if (!html) {
    return { copyright: "", credit: "" };
  }
  const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  const lines = paragraphs.map((part) => stripHtml(part)).filter(Boolean);
  if (lines.length >= 2) {
    return { copyright: lines[0], credit: lines[1] };
  }
  const plain = stripHtml(html);
  const split = plain
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    copyright: split.find((part) => /©|copyright/i.test(part)) || split[0] || "",
    credit: split.find((part) => part !== split[0]) || split[1] || "",
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
  const html = String(page.content || "").trim();
  const parts = splitHtmlAroundFirstHeading(html);
  let headTitle = parts.heading || "";
  let bodyHtml = parts.heading ? parts.intro : html;

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

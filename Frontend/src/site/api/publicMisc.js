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
  if (!page) return fallback;
  const html = String(page.content || "").trim();
  const parts = splitHtmlAroundFirstHeading(html);
  return {
    title: String(page.title || fallback.title || "").trim() || fallback.title,
    headTitle: parts.heading || fallback.headTitle,
    html: parts.intro || html || fallback.html,
    description: stripHtml(parts.intro || html) || fallback.description,
  };
}

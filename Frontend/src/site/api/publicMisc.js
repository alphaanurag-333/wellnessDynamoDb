import api, { normalizeApiError } from "../../api.js";

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

import api, { normalizeApiError } from "../../api.js";

export async function fetchClientTestimonials(params = {}) {
  try {
    const { data } = await api.get("/public/misc/client-testimonials", { params });
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

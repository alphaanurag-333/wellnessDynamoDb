import api, { normalizeApiError } from "../../api.js";

export async function fetchClientTestimonials(params = {}) {
  try {
    const { data } = await api.get("/public/misc/client-testimonials", { params });
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

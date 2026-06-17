import api, { authHeader, normalizeApiError } from "../../api.js";

function miscBase() {
  return "/admin/misc";
}

function appConfigBase() {
  return "/admin/app-config";
}

function staticPageBase() {
  return "/admin/misc/pages";
}

export async function getAppConfig(token) {
  try {
    const { data } = await api.get(appConfigBase(), {
      headers: authHeader(token),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function postAppConfig(token, formData) {
  try {
    const { data } = await api.post(appConfigBase(), formData, {
      headers: authHeader(token),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function patchAppConfig(token, formData) {
  try {
    const { data } = await api.patch(appConfigBase(), formData, {
      headers: authHeader(token),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function listPages(token) {
  try {
    const { data: body } = await api.get(staticPageBase(), {
      headers: authHeader(token),
    });
    return Array.isArray(body.data) ? body.data : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function getPageById(token, id) {
  try {
    const { data: body } = await api.get(`${staticPageBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return body.data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function createPage(token, payload) {
  try {
    const { data } = await api.post(staticPageBase(), payload, {
      headers: authHeader(token),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updatePage(token, id, payload) {
  try {
    const { data } = await api.patch(`${staticPageBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deletePage(token, id) {
  try {
    const { data } = await api.delete(`${staticPageBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

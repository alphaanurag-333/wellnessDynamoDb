import api, { authHeader, normalizeApiError } from "../api.js";

function base() {
  return "/user/commitment-letter";
}

export async function userGetCommitmentLetterTemplate(token) {
  try {
    const { data } = await api.get(`${base()}/template`, { headers: authHeader(token) });
    return data.templateUrl || "";
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userGetCommitmentLetter(token) {
  try {
    const { data } = await api.get(base(), { headers: authHeader(token) });
    return data.commitmentLetter ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userSubmitCommitmentLetter(token, file) {
  const fd = new FormData();
  fd.append("file", file);
  try {
    const { data } = await api.post(base(), fd, {
      headers: { ...authHeader(token), "Content-Type": "multipart/form-data" },
    });
    return data.commitmentLetter;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userResubmitCommitmentLetter(token, file) {
  const fd = new FormData();
  fd.append("file", file);
  try {
    const { data } = await api.patch(base(), fd, {
      headers: { ...authHeader(token), "Content-Type": "multipart/form-data" },
    });
    return data.commitmentLetter;
  } catch (error) {
    normalizeApiError(error);
  }
}

const config = require("../config");
const AppError = require("../utils/AppError");
const { getStoredObjectBuffer } = require("../utils/s3");
const { parseAiJson } = require("../utils/labReportAi");
const {
  buildMealPhotoAiPrompt,
  normalizeMealPhotoAi,
} = require("../utils/mealPhotoAi");

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 90_000;

function assertAiConfigured() {
  if (config.openaiApiKey) return;
  throw new AppError(
    "AI analysis is not configured. Set OPENAI_API_KEY on the server.",
    503
  );
}

function mimeFromKey(fileKey, contentType) {
  const type = String(contentType || "").toLowerCase();
  if (type.startsWith("image/")) return type;
  const ext = String(fileKey || "").split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function extractOpenAiText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const chunks = [];
  for (const item of payload?.output || []) {
    for (const part of item?.content || []) {
      if (part?.text) chunks.push(part.text);
      if (part?.type === "output_text" && part?.text) chunks.push(part.text);
    }
  }
  return chunks.join("\n").trim();
}

async function callOpenAi({ buffer, mimeType, prompt }, { jsonFormat = true } = {}) {
  const body = {
    model: config.openaiModel || "gpt-4.1-mini",
    temperature: 0.2,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: `data:${mimeType};base64,${buffer.toString("base64")}`,
          },
          { type: "input_text", text: prompt },
        ],
      },
    ],
  };
  if (jsonFormat) body.text = { format: { type: "json_object" } };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify(body),
  });

  const payload = await readJson(response);
  if (!response.ok) {
    if (jsonFormat && response.status === 400) {
      return callOpenAi({ buffer, mimeType, prompt }, { jsonFormat: false });
    }
    const detail = payload?.error?.message || payload?.message || `OpenAI request failed (${response.status})`;
    throw new AppError(detail, response.status >= 400 && response.status < 500 ? response.status : 502);
  }

  const text = extractOpenAiText(payload);
  if (!text) throw new AppError("AI returned no analysis for this meal photo", 502);
  return text;
}

async function analyzeMealPhoto({ fileKey, category, mealType, description }) {
  assertAiConfigured();

  const { buffer, contentType } = await getStoredObjectBuffer(fileKey);
  if (!buffer?.length) {
    throw new AppError("The uploaded meal photo is empty", 422);
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new AppError("Meal photo is too large for AI analysis (max 10 MB)", 413);
  }

  const mimeType = mimeFromKey(fileKey, contentType);
  if (!mimeType.startsWith("image/")) {
    throw new AppError("AI meal analysis only supports JPEG, PNG, and WebP photos", 422);
  }

  const prompt = buildMealPhotoAiPrompt({ category, mealType, description });

  let rawText;
  try {
    rawText = await callOpenAi({ buffer, mimeType, prompt });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw new AppError("AI analysis timed out. Try again with a clearer photo.", 504);
    }
    throw err;
  }

  let parsed;
  try {
    parsed = parseAiJson(rawText);
  } catch (err) {
    const preview = String(rawText || "").replace(/\s+/g, " ").slice(0, 180);
    if (preview) console.warn("[mealPhotoAi] JSON parse failed:", preview);
    throw new AppError("AI did not return valid JSON. Try a clearer meal photo.", 502);
  }

  return normalizeMealPhotoAi(parsed);
}

module.exports = {
  analyzeMealPhoto,
  assertAiConfigured,
};

const config = require("../config");
const AppError = require("../utils/AppError");
const { getStoredObjectBuffer } = require("../utils/s3");
const {
  buildLabReportAiPrompt,
  parseAiJson,
  normalizeAiAnalysis,
} = require("../utils/labReportAi");

const MAX_FILE_BYTES = 15 * 1024 * 1024;
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
  if (type.startsWith("image/") || type === "application/pdf") return type;
  const ext = String(fileKey || "").split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "application/pdf";
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

function openAiInputContent({ buffer, mimeType, fileName }) {
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
  if (String(mimeType).startsWith("image/")) {
    return { type: "input_image", image_url: dataUrl };
  }
  return {
    type: "input_file",
    filename: fileName || "blood-report.pdf",
    file_data: dataUrl,
  };
}

async function callOpenAi({ buffer, mimeType, prompt, fileName }, { jsonFormat = true } = {}) {
  const body = {
    model: config.openaiModel || "gpt-4.1-mini",
    temperature: 0.2,
    input: [
      {
        role: "user",
        content: [
          openAiInputContent({ buffer, mimeType, fileName }),
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
      return callOpenAi({ buffer, mimeType, prompt, fileName }, { jsonFormat: false });
    }
    const detail = payload?.error?.message || payload?.message || `OpenAI request failed (${response.status})`;
    throw new AppError(detail, response.status >= 400 && response.status < 500 ? response.status : 502);
  }

  const text = extractOpenAiText(payload);
  if (!text) throw new AppError("AI returned no analysis for this report", 502);
  return text;
}

async function analyzeLabReportFile({ fileKey, reportDate }) {
  assertAiConfigured();

  const { buffer, contentType } = await getStoredObjectBuffer(fileKey);
  if (!buffer?.length) {
    throw new AppError("The uploaded report file is empty", 422);
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new AppError("Report file is too large for AI analysis (max 15 MB)", 413);
  }

  const mimeType = mimeFromKey(fileKey, contentType);
  const prompt = buildLabReportAiPrompt({ reportDate });
  const fileName = String(fileKey || "").split("/").pop() || "blood-report.pdf";

  let rawText;
  try {
    rawText = await callOpenAi({ buffer, mimeType, prompt, fileName });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw new AppError("AI analysis timed out. Try again with a smaller or clearer PDF.", 504);
    }
    throw err;
  }

  let parsed;
  try {
    parsed = parseAiJson(rawText);
  } catch (err) {
    throw new AppError(err.message || "AI did not return a usable analysis", 502);
  }

  try {
    return normalizeAiAnalysis(parsed, { reportDate });
  } catch (err) {
    throw new AppError(err.message || "AI could not extract markers from this report", 422);
  }
}

module.exports = {
  analyzeLabReportFile,
  assertAiConfigured,
};

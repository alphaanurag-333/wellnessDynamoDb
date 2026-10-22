const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const AppError = require("./AppError");

const execFileAsync = promisify(execFile);

/** OpenAI / app target: keep blood-report PDFs at or below this size. */
const LAB_REPORT_PDF_MAX_BYTES = 1024 * 1024;

const COMPRESS_FAILED_MESSAGE =
  "Could not compress this PDF below 1 MB. Upload a smaller file or install Ghostscript on the server.";

let cachedGsBinary = null;
let gsLookupDone = false;

async function gsBinaryExists(candidate) {
  try {
    await execFileAsync(candidate, ["-version"], { timeout: 8000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function resolveGhostscriptBinary() {
  if (gsLookupDone) return cachedGsBinary;
  gsLookupDone = true;

  const fromEnv = String(process.env.GHOSTSCRIPT_BIN || "").trim();
  if (fromEnv && (await gsBinaryExists(fromEnv))) {
    cachedGsBinary = fromEnv;
    return cachedGsBinary;
  }

  const names =
    process.platform === "win32"
      ? ["gswin64c", "gswin32c", "gswin64c.exe", "gswin32c.exe", "gs"]
      : ["gs", "gswin64c", "gswin32c"];

  for (const name of names) {
    if (await gsBinaryExists(name)) {
      cachedGsBinary = name;
      return cachedGsBinary;
    }
  }

  if (process.platform === "win32") {
    const roots = [
      process.env["ProgramFiles"],
      process.env["ProgramFiles(x86)"],
      "C:\\Program Files",
      "C:\\Program Files (x86)",
    ].filter(Boolean);

    for (const root of roots) {
      for (const exe of ["gswin64c.exe", "gswin32c.exe"]) {
        const full = path.join(root, "gs", exe);
        try {
          await fs.access(full);
          if (await gsBinaryExists(full)) {
            cachedGsBinary = full;
            return cachedGsBinary;
          }
        } catch {
          /* try next */
        }
      }
    }
  }

  cachedGsBinary = null;
  return null;
}

async function runGhostscript(inputBuffer, { pdfSettings, colorDpi, grayDpi }) {
  const gs = await resolveGhostscriptBinary();
  if (!gs) {
    throw new AppError(
      "PDF compression is not available on the server (Ghostscript missing). Set GHOSTSCRIPT_BIN or upload a PDF under 1 MB.",
      503
    );
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "lab-report-pdf-"));
  const inPath = path.join(tmpDir, "in.pdf");
  const outPath = path.join(tmpDir, "out.pdf");

  try {
    await fs.writeFile(inPath, inputBuffer);
    const args = [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      `-dPDFSETTINGS=${pdfSettings}`,
      "-dDetectDuplicateImages=true",
      "-dCompressFonts=true",
      "-dEmbedAllFonts=true",
      "-dSubsetFonts=true",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
    ];

    if (colorDpi) {
      args.push(
        "-dColorImageDownsampleType=/Bicubic",
        `-dColorImageResolution=${colorDpi}`,
        "-dGrayImageDownsampleType=/Bicubic",
        `-dGrayImageResolution=${grayDpi ?? colorDpi}`,
        "-dMonoImageDownsampleType=/Bicubic",
        `-dMonoImageResolution=${Math.min(colorDpi, 300)}`
      );
    }

    args.push(`-sOutputFile=${outPath}`, inPath);

    await execFileAsync(gs, args, { timeout: 120_000, windowsHide: true, maxBuffer: 20 * 1024 * 1024 });
    return await fs.readFile(outPath);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function compressLabReportPdfBuffer(buffer) {
  if (!buffer?.length) {
    throw new AppError("PDF file is empty", 400);
  }
  if (buffer.length <= LAB_REPORT_PDF_MAX_BYTES) {
    return buffer;
  }

  const passes = [
    { pdfSettings: "/ebook" },
    { pdfSettings: "/screen" },
    { pdfSettings: "/screen", colorDpi: 120, grayDpi: 120 },
    { pdfSettings: "/screen", colorDpi: 96, grayDpi: 96 },
    { pdfSettings: "/screen", colorDpi: 72, grayDpi: 72 },
  ];

  let current = buffer;
  for (const pass of passes) {
    current = await runGhostscript(current, pass);
    if (current.length <= LAB_REPORT_PDF_MAX_BYTES) {
      return current;
    }
  }

  throw new AppError(COMPRESS_FAILED_MESSAGE, 413);
}

module.exports = {
  LAB_REPORT_PDF_MAX_BYTES,
  COMPRESS_FAILED_MESSAGE,
  resolveGhostscriptBinary,
  compressLabReportPdfBuffer,
};

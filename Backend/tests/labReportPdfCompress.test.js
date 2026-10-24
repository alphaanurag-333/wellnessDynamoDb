const test = require("node:test");
const assert = require("node:assert/strict");
const {
  compressLabReportPdfBuffer,
  LAB_REPORT_PDF_MAX_BYTES,
} = require("../utils/labReportPdfCompress");

test("compressLabReportPdfBuffer returns small PDFs unchanged", async () => {
  const tiny = Buffer.from("%PDF-1.4 tiny\n%%EOF");
  const out = await compressLabReportPdfBuffer(tiny);
  assert.equal(out, tiny);
  assert.ok(tiny.length < LAB_REPORT_PDF_MAX_BYTES);
});

test("compressLabReportPdfBuffer rejects empty buffer", async () => {
  await assert.rejects(() => compressLabReportPdfBuffer(Buffer.alloc(0)), /empty/i);
});

test("compressLabReportPdfBuffer can skip compression when Ghostscript is missing", async () => {
  const large = Buffer.alloc(LAB_REPORT_PDF_MAX_BYTES + 1, 0x25);
  const out = await compressLabReportPdfBuffer(large, { allowUncompressedIfGsMissing: true });
  assert.equal(out, large);
});

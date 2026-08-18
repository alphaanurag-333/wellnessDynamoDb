function getClientIp(req) {
  if (!req) return "";
  const forwarded = req.headers?.["x-forwarded-for"] || req.headers?.["X-Forwarded-For"];
  const raw = forwarded
    ? String(forwarded).split(",")[0].trim()
    : String(req.ip || req.socket?.remoteAddress || "").trim();
  return raw.replace(/^::ffff:/, "").trim();
}

module.exports = { getClientIp };

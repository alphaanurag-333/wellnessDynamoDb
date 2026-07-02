function readCatalogPagination(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  return { page, limit };
}

function wantsCatalogPagination(req) {
  return (
    req.query.page != null ||
    req.query.limit != null ||
    Boolean(String(req.query.search || "").trim()) ||
    Boolean(String(req.query.category || "").trim()) ||
    Boolean(String(req.query.type || "").trim())
  );
}

module.exports = {
  readCatalogPagination,
  wantsCatalogPagination,
};

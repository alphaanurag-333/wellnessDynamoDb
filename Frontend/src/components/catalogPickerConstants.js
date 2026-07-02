export const CATALOG_PAGE_SIZE = 10;

export function emptyCatalogPagination(page = 1, limit = CATALOG_PAGE_SIZE) {
  return { page, limit, total: 0, pages: 1 };
}

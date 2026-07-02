import axios from "axios";
import { getApiBase } from "../../api.js";
import { CATALOG_PAGE_SIZE } from "../../components/catalogPickerConstants.js";

function buildParams({ page = 1, limit = CATALOG_PAGE_SIZE, search, category, type } = {}) {
  const params = { page, limit };
  if (search?.trim()) params.search = search.trim();
  if (category?.trim()) params.category = category.trim();
  if (type?.trim()) params.type = type.trim();
  return params;
}

export async function fetchActiveTestCatalog(options = {}) {
  const { data: body } = await axios.get(`${getApiBase()}/api/public/misc/test-catalog`, {
    params: buildParams(options),
  });
  return {
    tests: body.tests ?? [],
    grouped: body.grouped ?? {},
    pagination: body.pagination ?? null,
  };
}

export async function fetchActiveTestCatalogMeta() {
  const { data: body } = await axios.get(`${getApiBase()}/api/public/misc/test-catalog`);
  const tests = body.tests ?? [];
  const grouped = body.grouped ?? {};
  const categories = Object.keys(grouped).length
    ? Object.keys(grouped).sort()
    : [...new Set(tests.map((t) => t.category).filter(Boolean))].sort();
  return { categories };
}

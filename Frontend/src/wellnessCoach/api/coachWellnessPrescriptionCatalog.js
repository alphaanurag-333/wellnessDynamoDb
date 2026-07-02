import axios from "axios";
import { getApiBase } from "../../api.js";
import { CATALOG_PAGE_SIZE } from "../../components/catalogPickerConstants.js";

function buildParams({ page = 1, limit = CATALOG_PAGE_SIZE, search, category } = {}) {
  const params = { page, limit };
  if (search?.trim()) params.search = search.trim();
  if (category?.trim()) params.category = category.trim();
  return params;
}

export async function fetchActiveWellnessPrescriptionCatalog(options = {}) {
  const { data: body } = await axios.get(`${getApiBase()}/api/public/misc/wellness-prescription-catalog`, {
    params: buildParams(options),
  });
  return {
    prescriptions: body.prescriptions ?? [],
    groupedByCategory: body.groupedByCategory ?? {},
    pagination: body.pagination ?? null,
  };
}

export async function fetchActiveWellnessPrescriptionCatalogMeta() {
  const { data: body } = await axios.get(`${getApiBase()}/api/public/misc/wellness-prescription-catalog`);
  const prescriptions = body.prescriptions ?? [];
  const groupedByCategory = body.groupedByCategory ?? {};
  const categories = Object.keys(groupedByCategory).length
    ? Object.keys(groupedByCategory).sort()
    : [...new Set(prescriptions.map((p) => p.category).filter(Boolean))].sort();
  return { categories };
}

import axios from "axios";
import { getApiBase } from "../../api.js";
import { CATALOG_PAGE_SIZE } from "../../components/catalogPickerConstants.js";

function buildParams({ page = 1, limit = CATALOG_PAGE_SIZE, search, type } = {}) {
  const params = { page, limit };
  if (search?.trim()) params.search = search.trim();
  if (type?.trim()) params.type = type.trim();
  return params;
}

export async function fetchActiveMentalWellbeingCatalog(options = {}) {
  const { data: body } = await axios.get(`${getApiBase()}/api/public/misc/mental-wellbeing`, {
    params: buildParams(options),
  });
  return {
    mentalWellbeing: body.mentalWellbeing ?? [],
    pagination: body.pagination ?? null,
  };
}

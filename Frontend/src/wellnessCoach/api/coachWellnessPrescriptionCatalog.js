import axios from "axios";
import { getApiBase } from "../../api.js";

export async function fetchActiveWellnessPrescriptionCatalog() {
  const { data: body } = await axios.get(`${getApiBase()}/api/public/misc/wellness-prescription-catalog`);
  return {
    prescriptions: body.prescriptions ?? [],
    groupedByCategory: body.groupedByCategory ?? {},
  };
}

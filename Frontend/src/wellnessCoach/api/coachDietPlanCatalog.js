import axios from "axios";
import { getApiBase } from "../../api.js";

export async function fetchActiveDietPlanCatalog() {
  const { data: body } = await axios.get(`${getApiBase()}/api/public/misc/diet-plan-catalog`);
  return {
    plans: body.plans ?? [],
    groupedByType: body.groupedByType ?? {},
    groupedByCategory: body.groupedByCategory ?? {},
  };
}

import axios from "axios";
import { getApiBase } from "../../api.js";

export async function fetchActiveMentalWellbeingCatalog() {
  const { data: body } = await axios.get(`${getApiBase()}/api/public/misc/mental-wellbeing`);
  return {
    mentalWellbeing: body.mentalWellbeing ?? [],
  };
}

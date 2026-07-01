import axios from "axios";
import { getApiBase } from "../../api.js";

export async function fetchActivePhysicalExerciseCatalog() {
  const { data: body } = await axios.get(`${getApiBase()}/api/public/misc/physical-exercises`);
  return {
    physicalExercises: body.physicalExercises ?? [],
  };
}

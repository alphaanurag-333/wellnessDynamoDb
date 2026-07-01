import axios from "axios";
import { getApiBase } from "../../api.js";

export async function fetchActiveSupplementCatalog() {
  const { data: body } = await axios.get(`${getApiBase()}/api/public/misc/supplements`);
  return {
    supplements: body.supplements ?? [],
  };
}

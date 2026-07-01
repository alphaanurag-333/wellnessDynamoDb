import axios from "axios";
import { getApiBase } from "../../api.js";

export async function fetchActiveTestCatalog() {
  const { data: body } = await axios.get(`${getApiBase()}/api/public/misc/test-catalog`);
  return {
    tests: body.tests ?? [],
    grouped: body.grouped ?? {},
  };
}

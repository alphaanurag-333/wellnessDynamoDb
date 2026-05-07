import { HealthRecipeManagePage } from "./HealthRecipeManage.jsx";
import { HealthRecipeFormPage } from "./HealthRecipeFormPage.jsx";

export function HealthRecipePage({ mode = "manage" }) {
  if (mode === "edit") return <HealthRecipeFormPage mode="edit" />;
  if (mode === "create") return <HealthRecipeFormPage mode="create" />;
  return <HealthRecipeManagePage />;
}

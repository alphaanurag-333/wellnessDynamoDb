export const NAME_MAX_LEN = 60;
export const LIST_SEARCH_MAX_LEN = 50;
export const LIST_LIMIT = 10;

export function emptyForm() {
  return { name: "", permissions: [], status: "active" };
}

export function getRoleId(row) {
  return row?.id || row?._id || "";
}

export function validateRoleForm(form) {
  const name = String(form.name ?? "").trim();
  if (!name) return "Role name is required.";
  if (name.length > NAME_MAX_LEN) return `Role name cannot exceed ${NAME_MAX_LEN} characters.`;
  return "";
}

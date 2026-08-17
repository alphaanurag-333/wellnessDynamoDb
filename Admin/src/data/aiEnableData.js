export const AI_ENABLE_PAGE_SIZE = 20;

export function aiEnabledCount(people = []) {
  return people.filter((entry) => entry.enabled).length;
}

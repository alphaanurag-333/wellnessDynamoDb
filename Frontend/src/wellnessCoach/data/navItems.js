export const coachNavItems = [
  { to: "dashboard", label: "Dashboard", icon: "grid" },
  { to: "profile", label: "Profile", icon: "profile" },
];

export function flattenNavLinks(items) {
  const out = [];
  for (const item of items) {
    if (item.children?.length) {
      out.push(...flattenNavLinks(item.children));
    } else if (item.to) {
      out.push(item);
    }
  }
  return out;
}

export const coachNavItems = [
  { to: "dashboard", label: "Dashboard", icon: "grid" },
  { to: "my-heal-users", label: "Heal Clients", icon: "users" },
  { to: "my-assistants", label: "Assistants (AWC)", icon: "users" },
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

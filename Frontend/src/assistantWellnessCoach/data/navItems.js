export const assistantNavItems = [
  { to: "dashboard", label: "Dashboard", icon: "grid" },
  { to: "my-heal-users", label: "My Heal Clients", icon: "clipboard-list" },
  { to: "consultancy/transactions", label: "Consultancy Payments", icon: "wallet" },
  { to: "consultancy/enrolled-users", label: "Consultancy Users", icon: "user-check" },
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

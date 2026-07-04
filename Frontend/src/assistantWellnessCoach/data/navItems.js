export const assistantNavItems = [
  { to: "dashboard", label: "Dashboard", icon: "grid" },
  { to: "my-users", label: "My Clients", icon: "clipboard-list" },
  { to: "meal-approvals", label: "Meal Approvals", icon: "clipboard-list" },
  { to: "real-people-testimonials", label: "Testimonials", icon: "message-circle" },
  { to: "commitment-letters", label: "Commitment Letters", icon: "file" },
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

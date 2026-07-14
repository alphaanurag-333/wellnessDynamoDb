import { navItems, flattenNavLinks } from "../data/navItems.js";

/** Self-service account management — always available to authenticated admins. */
export const ALWAYS_VISIBLE_LEAVES = new Set(["profile"]);

/** Map a nav `to` segment (e.g. `consultancy/enrolled-users`) to permission base. */
export function toPermissionBase(to) {
  return String(to || "").replace(/\//g, ".");
}

/** Map a nav `to` segment to `….view` (when the leaf defines a view action). */
export function toViewPermissionSlug(to) {
  return `${toPermissionBase(to)}.view`;
}

/**
 * Sidebar / route access for a nav leaf.
 * Prefer `.view` when present on the role; otherwise any `.edit` / `.delete`
 * for the same leaf (modules with no View action in the UI).
 */
export function canAccessLeaf(to, { isSuperAdmin, permissions } = {}) {
  if (!to) return false;
  if (ALWAYS_VISIBLE_LEAVES.has(to)) return true;
  if (isSuperAdmin) return true;
  const list = Array.isArray(permissions) ? permissions : [];
  const base = toPermissionBase(to);
  return (
    list.includes(`${base}.view`) || list.includes(`${base}.edit`) || list.includes(`${base}.delete`)
  );
}

export function filterNavItemsByPermission(items, auth) {
  const visible = [];
  for (const item of items) {
    if (item.superAdminOnly && !auth?.isSuperAdmin) continue;

    if (Array.isArray(item.children)) {
      const children = item.children.filter((child) => canAccessLeaf(child.to, auth));
      if (children.length === 0) continue;
      visible.push({ ...item, children });
    } else if (canAccessLeaf(item.to, auth)) {
      visible.push(item);
    }
  }
  return visible;
}

/**
 * Resolve which nav leaf a pathname maps to (longest matching segment wins).
 * Returns `{ to, label, superAdminOnly }` or null.
 */
export function matchNavLeafFromPath(pathname) {
  const p = String(pathname || "").replace(/\/$/, "") || "/";
  if (!p.startsWith("/admin")) return null;

  const rest = p.slice("/admin".length).replace(/^\//, "");
  if (!rest) return { to: "dashboard", label: "Dashboard", superAdminOnly: false };

  const leaves = [];
  for (const item of navItems) {
    if (Array.isArray(item.children)) {
      for (const child of item.children) {
        leaves.push({
          to: child.to,
          label: child.label,
          superAdminOnly: Boolean(item.superAdminOnly),
        });
      }
    } else if (item.to) {
      leaves.push({
        to: item.to,
        label: item.label,
        superAdminOnly: Boolean(item.superAdminOnly),
      });
    }
  }

  const match = leaves
    .filter((leaf) => rest === leaf.to || rest.startsWith(`${leaf.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];

  return match || null;
}

export function canAccessPath(pathname, auth) {
  const leaf = matchNavLeafFromPath(pathname);
  if (!leaf) return true; // unknown / non-nav path — leave to the page itself
  if (leaf.superAdminOnly && !auth?.isSuperAdmin) return false;
  if (!canAccessLeaf(leaf.to, auth)) return false;

  const p = String(pathname || "").replace(/\/$/, "") || "/";
  const rest = p.startsWith("/admin") ? p.slice("/admin".length).replace(/^\//, "") : "";
  const afterLeaf = rest.startsWith(leaf.to) ? rest.slice(leaf.to.length).replace(/^\//, "") : "";
  const needsEdit = afterLeaf === "new" || /(^|\/)edit$/.test(afterLeaf);
  if (needsEdit && !auth?.isSuperAdmin) {
    const editSlug = `${leaf.to.replace(/\//g, ".")}.edit`;
    const list = Array.isArray(auth?.permissions) ? auth.permissions : [];
    if (!list.includes(editSlug)) return false;
  }
  return true;
}

/** First permitted admin path after login, e.g. `/admin/dashboard`. */
export function firstAllowedAdminPath(auth) {
  const visible = filterNavItemsByPermission(navItems, auth);
  const flat = flattenNavLinks(visible);
  const first = flat.find((item) => item.to && item.to !== "profile") || flat[0];
  if (!first?.to) return "/admin/profile";
  return `/admin/${first.to}`;
}

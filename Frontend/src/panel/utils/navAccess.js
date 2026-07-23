import { panelNavItems, flattenPanelNavLinks } from "../data/navConfig.js";

/** Where each account type's own copy of a `scope: "home"` nav leaf lives. */
const HOME_PREFIX_BY_ACCOUNT_TYPE = {
  admin: "/admin",
  wellness_coach: "/coach",
  assistant_wellness_coach: "/assistant",
  staff: "/panel",
};

export function homePrefixForAccountType(accountType) {
  return HOME_PREFIX_BY_ACCOUNT_TYPE[accountType] || "/panel";
}

/**
 * Resolve the actual href for a nav leaf, given the current staff account's
 * `accountType`. `scope: "panel"` and the (default) `"admin"` scope are
 * absolute — they only ever live under one prefix regardless of who's
 * viewing. `scope: "home"` resolves per-account-type so Dashboard/Profile
 * (everyone) and My Clients/Meal Approvals/Assistants (Coach/Assistant only)
 * always land on that viewer's own existing page.
 */
export function resolveNavHref(item, accountType) {
  const to = String(item?.to || "");
  if (item?.scope === "panel") return `/panel/${to}`;
  if (item?.scope === "home") return `${homePrefixForAccountType(accountType)}/${to}`;
  return `/admin/${to}`;
}

/** Unified-catalog permission slug for a nav leaf's `to` (matches `Backend/config/staffPermissionCatalog.js#toSlug`). */
function permissionSlugForLeaf(to) {
  return `${String(to || "").replace(/\//g, ".")}.view`;
}

function accountTypeAllowed(item, accountType) {
  if (!Array.isArray(item?.accountTypes) || item.accountTypes.length === 0) return true;
  return item.accountTypes.includes(accountType);
}

/**
 * Sidebar / route access for a Panel nav leaf.
 * `alwaysVisible` leaves (dashboard, profile) are self-service and never
 * permission-gated. `superAdminOnly` groups (Administration) are hidden from
 * every non-super-admin regardless of role permissions, mirroring the legacy
 * admin panel's "Administration" group. Every other leaf needs both its
 * `accountTypes` restriction (if any) satisfied and the matching
 * `<to>.view` unified permission slug.
 */
export function canAccessLeaf(to, { isSuperAdmin, permissions, accountType } = {}) {
  if (!to) return false;
  const leaf = flattenPanelNavLinks(panelNavItems).find((n) => n.to === to);
  if (leaf?.alwaysVisible) return true;
  if (isSuperAdmin) return true;

  const fullLeaf = findLeafItem(to);
  if (!accountTypeAllowed(fullLeaf, accountType)) return false;

  const parentGroup = panelNavItems.find(
    (item) => Array.isArray(item.children) && item.children.some((c) => c.to === to),
  );
  if (parentGroup?.superAdminOnly) return false;

  const perms = Array.isArray(permissions) ? permissions : [];
  return perms.includes(permissionSlugForLeaf(to));
}

function findLeafItem(to) {
  for (const item of panelNavItems) {
    if (item.to === to) return item;
    if (Array.isArray(item.children)) {
      const child = item.children.find((c) => c.to === to);
      if (child) return child;
    }
  }
  return null;
}

export function filterPanelNavItems(items, auth) {
  const visible = [];
  for (const item of items) {
    if (item.superAdminOnly && !auth?.isSuperAdmin) continue;
    if (!accountTypeAllowed(item, auth?.accountType)) continue;

    if (Array.isArray(item.children)) {
      const children = item.children.filter((child) => canAccessLeaf(child.to, auth));
      if (children.length === 0) continue;
      visible.push({ ...item, children });
    } else if (item.alwaysVisible || canAccessLeaf(item.to, auth)) {
      visible.push(item);
    }
  }
  return visible;
}

/** Resolve which Panel nav leaf a pathname maps to (longest matching segment wins). */
export function matchPanelNavLeafFromPath(pathname) {
  const p = String(pathname || "").replace(/\/$/, "") || "/";
  if (!p.startsWith("/panel")) return null;

  const rest = p.slice("/panel".length).replace(/^\//, "");
  if (!rest) return { to: "dashboard", label: "Dashboard", superAdminOnly: false };

  const leaves = [];
  for (const item of panelNavItems) {
    if (Array.isArray(item.children)) {
      for (const child of item.children) {
        if (child.scope !== "panel" && child.scope !== "home") continue;
        leaves.push({ to: child.to, label: child.label, superAdminOnly: Boolean(item.superAdminOnly) });
      }
    } else if (item.to && (item.scope === "home" || !item.scope)) {
      leaves.push({ to: item.to, label: item.label, superAdminOnly: Boolean(item.superAdminOnly) });
    }
  }

  const match = leaves
    .filter((leaf) => rest === leaf.to || rest.startsWith(`${leaf.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];

  return match || null;
}

export function canAccessPanelPath(pathname, auth) {
  const leaf = matchPanelNavLeafFromPath(pathname);
  if (!leaf) return true; // unknown / non-nav path — leave to the page itself
  if (leaf.superAdminOnly && !auth?.isSuperAdmin) return false;
  return true;
}

/** First permitted Panel path after login — always the dashboard. */
export function firstAllowedPanelPath() {
  return "/panel/dashboard";
}

/**
 * Coach permission key registry — keep in sync with
 * Backend/config/coachPermissionCatalog.js
 *
 * Generated from coachNavItems + CLIENT_HUB_TAB_GROUPS / CLIENT_HUB_TABS.
 */

import { coachNavItems, flattenNavLinks } from "./navItems.js";
import {
  CLIENT_HUB_TAB_GROUPS,
  CLIENT_HUB_TABS,
} from "../../components/clientHubShared.js";

export function navPermissionKey(to) {
  return `nav.${to}`;
}

export function clientTabGroupKey(groupId) {
  return `clientTab.${groupId}`;
}

export function clientTabChildKey(groupId, tabId) {
  return `clientTab.${groupId}.${tabId}`;
}

/** Parent group key for a child clientTab.* key, or null. */
export function parentPermissionKey(slug) {
  const key = String(slug || "");
  if (!key.startsWith("clientTab.")) return null;
  const parts = key.split(".");
  if (parts.length < 3) return null;
  return `${parts[0]}.${parts[1]}`;
}

export function getNavPermissionKeys() {
  return flattenNavLinks(coachNavItems).map((item) => ({
    key: navPermissionKey(item.to),
    label: item.label,
    to: item.to,
  }));
}

export function getClientTabPermissionKeys() {
  const out = [];
  for (const group of CLIENT_HUB_TAB_GROUPS) {
    const groupKey = clientTabGroupKey(group.id);
    out.push({
      key: groupKey,
      label: group.label,
      groupId: group.id,
      isGroup: true,
    });
    for (const tabId of group.tabIds) {
      const tab = CLIENT_HUB_TABS[tabId];
      out.push({
        key: clientTabChildKey(group.id, tabId),
        label: tab?.shortLabel || tab?.label || tabId,
        groupId: group.id,
        tabId,
        isGroup: false,
        parentKey: groupKey,
      });
    }
  }
  return out;
}

export const ALL_COACH_PERMISSION_KEYS = [
  ...getNavPermissionKeys().map((p) => p.key),
  ...getClientTabPermissionKeys().map((p) => p.key),
];

const TAB_ID_TO_PERMISSION = {};
for (const group of CLIENT_HUB_TAB_GROUPS) {
  for (const tabId of group.tabIds) {
    TAB_ID_TO_PERMISSION[tabId] = clientTabChildKey(group.id, tabId);
  }
}

export function permissionKeyForClientTab(tabId) {
  return TAB_ID_TO_PERMISSION[tabId] || null;
}

export function allTruePermissionMap() {
  const map = {};
  for (const key of ALL_COACH_PERMISSION_KEYS) map[key] = true;
  return map;
}

/**
 * Effective access for a key given a boolean permission map (applies parent gate).
 */
export function hasCoachPermission(permissions, key) {
  if (!permissions || !key) return false;
  if (permissions[key] !== true) return false;
  const parent = parentPermissionKey(key);
  if (parent && permissions[parent] !== true) return false;
  return true;
}

/**
 * Checkbox-tree groups for admin Role/Coach forms (same shape as GET /admin/permissions?scope=COACH).
 * Built locally from coachNavItems + CLIENT_HUB_TAB_GROUPS so the UI never depends on a stale API.
 */
export function getCoachPermissionCheckboxGroups() {
  const navGroup = {
    id: "nav",
    label: "Sidebar navigation",
    items: getNavPermissionKeys().map((item) => ({
      to: item.to,
      label: item.label,
      actions: ["access"],
      permissions: [{ action: "access", slug: item.key }],
    })),
  };

  const clientGroups = CLIENT_HUB_TAB_GROUPS.map((group) => {
    const groupKey = clientTabGroupKey(group.id);
    return {
      id: `clientTab.${group.id}`,
      label: `Client tabs · ${group.label}`,
      items: [
        {
          to: group.id,
          label: `${group.label} (section)`,
          actions: ["access"],
          permissions: [{ action: "access", slug: groupKey }],
        },
        ...group.tabIds.map((tabId) => {
          const tab = CLIENT_HUB_TABS[tabId];
          return {
            to: `${group.id}/${tabId}`,
            label: tab?.shortLabel || tab?.label || tabId,
            actions: ["access"],
            permissions: [
              {
                action: "access",
                slug: clientTabChildKey(group.id, tabId),
              },
            ],
          };
        }),
      ],
    };
  });

  return [navGroup, ...clientGroups];
}

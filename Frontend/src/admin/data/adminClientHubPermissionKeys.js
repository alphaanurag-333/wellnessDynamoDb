/**
 * Admin Client Hub permission keys — keep in sync with
 * Backend/config/permissionCatalog.js (users.clientHub.*).
 */

import {
  CLIENT_HUB_TAB_GROUPS,
  CLIENT_HUB_TABS,
} from "../../components/clientHubShared.js";

export function clientHubGroupKey(groupId) {
  return `users.clientHub.${groupId}`;
}

export function clientHubChildKey(groupId, tabId) {
  return `users.clientHub.${groupId}.${tabId}`;
}

/** Parent group key for a child users.clientHub.* key, or null. */
export function parentClientHubPermissionKey(slug) {
  const key = String(slug || "");
  if (!key.startsWith("users.clientHub.")) return null;
  const parts = key.split(".");
  if (parts.length < 4) return null;
  return parts.slice(0, 3).join(".");
}

const TAB_ID_TO_PERMISSION = {};
for (const group of CLIENT_HUB_TAB_GROUPS) {
  for (const tabId of group.tabIds) {
    TAB_ID_TO_PERMISSION[tabId] = clientHubChildKey(group.id, tabId);
  }
}

export function permissionKeyForClientHubTab(tabId) {
  return TAB_ID_TO_PERMISSION[tabId] || null;
}

/**
 * Effective access for a client-hub key (applies parent group gate).
 */
export function hasClientHubPermission(permissions, key) {
  if (!permissions || !key) return false;
  if (Array.isArray(permissions)) {
    if (!permissions.includes(key)) return false;
    const parent = parentClientHubPermissionKey(key);
    if (parent && !permissions.includes(parent)) return false;
    return true;
  }
  if (permissions[key] !== true) return false;
  const parent = parentClientHubPermissionKey(key);
  if (parent && permissions[parent] !== true) return false;
  return true;
}

export function getAdminClientHubPermissionCheckboxGroups() {
  return CLIENT_HUB_TAB_GROUPS.map((group) => {
    const groupKey = clientHubGroupKey(group.id);
    return {
      id: `users.clientHub.${group.id}`,
      label: `Client programs · ${group.label}`,
      items: [
        {
          to: `users/client-hub/${group.id}`,
          label: `${group.label} (section)`,
          actions: ["access"],
          permissions: [{ action: "access", slug: groupKey }],
        },
        ...group.tabIds.map((tabId) => {
          const tab = CLIENT_HUB_TABS[tabId];
          return {
            to: `users/client-hub/${group.id}/${tabId}`,
            label: tab?.shortLabel || tab?.label || tabId,
            actions: ["access"],
            permissions: [{ action: "access", slug: clientHubChildKey(group.id, tabId) }],
          };
        }),
      ],
    };
  });
}

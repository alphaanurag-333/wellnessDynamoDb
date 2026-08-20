/**
 * Client profile sidebar sections → Access Control console permissions.
 * Slugs mirror PERM_CATALOG in data/accessData.js.
 */
export const CLIENT_PROFILE_SECTIONS = {
  glance: { view: "console.cl.view" },
  personal: { view: "console.pii.view", edit: "console.pii.edit" },
  body: { view: "console.body.view", edit: "console.body.edit", upload: "console.body.upload" },
  medical: { view: "console.pii.view" },
  internal: {
    view: "console.rep.view",
    edit: "console.rep.edit",
    upload: "console.rep.upload",
    export: "console.rep.export",
    create: "console.rep.upload",
  },
  launch: { view: "console.cl.view", edit: "console.cl.edit", create: "console.diet.create" },
  food: {
    view: "console.diet.view",
    create: "console.diet.create",
    edit: "console.diet.edit",
    delete: "console.diet.delete",
  },
  bms: {
    view: "console.diet.view",
    create: "console.diet.create",
    edit: "console.diet.edit",
    delete: "console.diet.delete",
  },
  nutritions: {
    view: "console.diet.view",
    create: "console.diet.create",
    edit: "console.diet.edit",
    delete: "console.diet.delete",
  },
  "health-progress": { view: "console.body.view", export: "console.body.view" },
  reflection: { view: "console.diet.view", edit: "console.diet.edit" },
  prescription: {
    view: "console.diet.view",
    create: "console.diet.create",
    edit: "console.diet.edit",
    delete: "console.diet.delete",
  },
  presentable: { view: "console.pii.view", edit: "console.pii.edit" },
  exchange: {
    view: "console.pg.view",
    create: "console.pg.create",
    edit: "console.pg.edit",
    toggle: "console.pg.toggle",
  },
  counselling: {
    view: "console.cal.view",
    create: "console.cal.create",
    edit: "console.cal.edit",
    delete: "console.cal.delete",
  },
  protocol: { view: "console.diet.view", edit: "console.diet.edit", create: "console.diet.create" },
  gut: { view: "console.diet.view", create: "console.diet.create", edit: "console.diet.edit" },
  consultation: { view: "console.cal.view" },
};

const SECTION_LABELS = {
  glance: "At a Glance",
  personal: "Personal Details",
  body: "Body Analytics",
  medical: "Medical Conditions",
  internal: "Internal Parameters",
  launch: "LAUNCH",
  food: "Food & Water Tracking",
  bms: "Body, Mind & Soul",
  nutritions: "Nutritions",
  "health-progress": "Health Progress",
  reflection: "Daily Reflection",
  prescription: "Wellness Prescription",
  presentable: "Presentable Pics",
  exchange: "Energy Exchange",
  counselling: "Counselling Sessions",
  protocol: "Protocol Settings",
  gut: "Gut Reset",
  consultation: "Consultation",
};

export function clientSectionLabel(sectionId) {
  return SECTION_LABELS[sectionId] || "Section";
}

export function clientSectionCanView(can, sectionId) {
  const spec = CLIENT_PROFILE_SECTIONS[sectionId];
  if (!spec?.view) return true;
  return can(spec.view);
}

export function filterClientProfileMenu(menu, can) {
  return (menu || []).filter((item) => clientSectionCanView(can, item.id));
}

export function resolveClientSectionPermissions(can, sectionId) {
  const spec = CLIENT_PROFILE_SECTIONS[sectionId] || { view: "console.cl.view" };
  const canAction = (slug) => (slug ? can(slug) : false);
  const canView = canAction(spec.view);
  const canCreate = canAction(spec.create);
  const canEdit = canAction(spec.edit);
  const canDelete = canAction(spec.delete);
  const canUpload = canAction(spec.upload);
  const canExport = canAction(spec.export);
  const canToggle = canAction(spec.toggle);
  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    canUpload,
    canExport,
    canToggle,
    canWrite: canCreate || canEdit || canUpload,
  };
}

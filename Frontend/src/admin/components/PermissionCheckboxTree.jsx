import { useLayoutEffect, useMemo, useRef } from "react";

const ACTION_LABELS = { view: "View", edit: "Edit", delete: "Delete" };

function CheckboxWithIndeterminate({
  checked,
  indeterminate = false,
  onChange,
  disabled = false,
  id,
  "aria-label": ariaLabel,
}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate) && !checked;
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      id={id}
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange?.(e.target.checked)}
    />
  );
}

function collectSlugs(groups) {
  const slugs = [];
  for (const group of groups || []) {
    for (const item of group.items || []) {
      for (const perm of item.permissions || []) {
        if (perm?.slug) slugs.push(perm.slug);
      }
    }
  }
  return [...new Set(slugs)];
}

/**
 * Checkbox tree mirroring the admin sidebar structure: one group per nav
 * section, one row per nav leaf, one checkbox per action (view/edit/delete).
 * `groups` is the shape returned by GET /admin/permissions.
 */
export function PermissionCheckboxTree({ groups, selectedPermissions, onChange, disabled = false }) {
  const selected = Array.isArray(selectedPermissions) ? selectedPermissions : [];
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const allSlugs = useMemo(() => collectSlugs(groups), [groups]);
  const allSelectedCount = allSlugs.filter((slug) => selectedSet.has(slug)).length;
  const allChecked = allSlugs.length > 0 && allSelectedCount === allSlugs.length;
  const allIndeterminate = allSelectedCount > 0 && !allChecked;

  const setSelected = (nextSlugs) => {
    onChange([...new Set(nextSlugs)]);
  };

  /** Apply or remove a batch of slugs based on the checkbox's new checked state. */
  const applyMany = (slugs, checked) => {
    if (checked) {
      const next = new Set(selected);
      for (const slug of slugs) next.add(slug);
      setSelected([...next]);
      return;
    }
    const remove = new Set(slugs);
    setSelected(selected.filter((slug) => !remove.has(slug)));
  };

  const toggleOne = (slug, checked) => {
    const next = new Set(selected);
    if (checked) next.add(slug);
    else next.delete(slug);
    setSelected([...next]);
  };

  return (
    <div className="permission-tree">
      <div className="permission-tree__select-all">
        <CheckboxWithIndeterminate
          checked={allChecked}
          indeterminate={allIndeterminate}
          disabled={disabled || allSlugs.length === 0}
          aria-label="Select all permissions"
          onChange={(checked) => applyMany(allSlugs, checked)}
        />
        <button
          type="button"
          className="permission-tree__select-all-label"
          disabled={disabled || allSlugs.length === 0}
          onClick={() => applyMany(allSlugs, !allChecked)}
        >
          Select all permissions
        </button>
        <small className="permission-tree__select-all-count">
          {allSelectedCount}/{allSlugs.length}
        </small>
      </div>

      <div className="permission-tree__body">
        {(groups || []).map((group) => {
          const groupSlugs = collectSlugs([group]);
          const groupSelectedCount = groupSlugs.filter((slug) => selectedSet.has(slug)).length;
          const groupChecked = groupSlugs.length > 0 && groupSelectedCount === groupSlugs.length;
          const groupIndeterminate = groupSelectedCount > 0 && !groupChecked;

          return (
            <div className="permission-tree__group" key={group.id}>
              <div className="permission-tree__group-header">
                <CheckboxWithIndeterminate
                  checked={groupChecked}
                  indeterminate={groupIndeterminate}
                  disabled={disabled || groupSlugs.length === 0}
                  aria-label={`Select all in ${group.label}`}
                  onChange={(checked) => applyMany(groupSlugs, checked)}
                />
                <button
                  type="button"
                  className="permission-tree__group-label"
                  disabled={disabled || groupSlugs.length === 0}
                  onClick={() => applyMany(groupSlugs, !groupChecked)}
                >
                  {group.label}
                </button>
              </div>

              <div className="permission-tree__items">
                {(group.items || []).map((item) => {
                  const itemSlugs = (item.permissions || []).map((p) => p.slug).filter(Boolean);
                  const itemSelectedCount = itemSlugs.filter((slug) => selectedSet.has(slug)).length;
                  const itemChecked = itemSlugs.length > 0 && itemSelectedCount === itemSlugs.length;
                  const itemIndeterminate = itemSelectedCount > 0 && !itemChecked;

                  return (
                    <div className="permission-tree__item" key={item.to}>
                      <div className="permission-tree__item-label">
                        <CheckboxWithIndeterminate
                          checked={itemChecked}
                          indeterminate={itemIndeterminate}
                          disabled={disabled || itemSlugs.length === 0}
                          aria-label={`Select all for ${item.label}`}
                          onChange={(checked) => applyMany(itemSlugs, checked)}
                        />
                        <button
                          type="button"
                          className="permission-tree__item-name"
                          disabled={disabled || itemSlugs.length === 0}
                          onClick={() => applyMany(itemSlugs, !itemChecked)}
                        >
                          {item.label}
                        </button>
                      </div>
                      <div className="permission-tree__actions">
                        {(item.permissions || []).map((perm) => (
                          <label className="permission-tree__action" key={perm.slug}>
                            <input
                              type="checkbox"
                              checked={selectedSet.has(perm.slug)}
                              disabled={disabled}
                              onChange={(e) => toggleOne(perm.slug, e.target.checked)}
                            />
                            <span>{ACTION_LABELS[perm.action] || perm.action}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

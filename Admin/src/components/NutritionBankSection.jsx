import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminCreateNutritionBankItem,
  adminDeleteNutritionBankItem,
  adminListNutritionBank,
  adminUpdateNutritionBankItem,
} from "../api/nutritionBankApi.js";
import {
  emptyNutritionDraft,
  formatBottlePrice,
  formatPack,
  NUTRITION_BANK_PAGE_SIZE,
  parseBottlePrice,
  parsePackSize,
  unitOptionsFor,
} from "../data/nutritionBankData.js";
import { CfgSelect, ListPagination } from "./shared.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { useMediaPicker } from "./useMediaPicker.jsx";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Live" },
  { value: "inactive", label: "Hidden" },
];

const SUPPLEMENT_NAME_MAX_LEN = 80;
const SUPPLEMENT_DESCRIPTION_MAX_LEN = 500;

function unitSelectOptions(unit) {
  return unitOptionsFor(unit).map((value) => ({ id: value, value, label: value }));
}

function Panel({ title, subtitle, actions, children, className = "" }) {
  const hasHead = Boolean(title || subtitle || actions);
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
      {hasHead ? (
        <div className="ua-cfg-panel__head">
          <div className="ua-cfg-panel__copy">
            {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
            {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
          </div>
          {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function ImagePicker({ previewUrl, disabled, onPick, label = "Upload image" }) {
  return (
    <button
      type="button"
      className={`ua-cfg-nb-uploader${previewUrl ? " has-image" : ""}`}
      disabled={disabled}
      aria-label={label}
      onClick={() => onPick?.()}
    >
      {previewUrl ? (
        <>
          <img src={previewUrl} alt="" />
          <span className="ua-cfg-nb-uploader__change">Change</span>
        </>
      ) : (
        <span className="ua-cfg-nb-uploader__empty">
          <span aria-hidden="true">+</span>
          {label}
        </span>
      )}
    </button>
  );
}

function SupplementFormFields({
  name,
  description,
  packSize,
  unit,
  price,
  previewUrl,
  disabled,
  onChange,
  onPickImage,
}) {
  return (
    <div className="ua-cfg-nb-form">
      <ImagePicker
        previewUrl={previewUrl}
        disabled={disabled}
        label="Upload image"
        onPick={onPickImage}
      />
      <div className="ua-cfg-nb-form__fields">
        <label>
          <span className="ua-cfg-nb-form__label-row">
            <span>Name</span>
            <span className="ua-cfg-nb-form__count">
              {String(name || "").length}/{SUPPLEMENT_NAME_MAX_LEN}
            </span>
          </span>
          <input
            type="text"
            className="ua-cfg-tc-field"
            placeholder="e.g. Omega-3 fish oil"
            value={name}
            maxLength={SUPPLEMENT_NAME_MAX_LEN}
            disabled={disabled}
            onChange={(event) =>
              onChange({ name: event.target.value.slice(0, SUPPLEMENT_NAME_MAX_LEN) })
            }
          />
        </label>
        <label className="ua-cfg-nb-form__desc">
          <span className="ua-cfg-nb-form__label-row">
            <span>Description</span>
            <span className="ua-cfg-nb-form__count">
              {String(description || "").length}/{SUPPLEMENT_DESCRIPTION_MAX_LEN}
            </span>
          </span>
          <textarea
            className="ua-cfg-nb-textarea"
            rows={3}
            placeholder="Short note coaches will see"
            value={description}
            maxLength={SUPPLEMENT_DESCRIPTION_MAX_LEN}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                description: event.target.value.slice(0, SUPPLEMENT_DESCRIPTION_MAX_LEN),
              })
            }
          />
        </label>
        <div className="ua-cfg-nb-form__meta">
          <label>
            <span>Pack size</span>
            <input
              type="text"
              inputMode="numeric"
              className="ua-cfg-tc-field"
              placeholder="e.g. 60"
              value={packSize}
              disabled={disabled}
              onChange={(event) => onChange({ packSize: event.target.value.replace(/[^\d]/g, "") })}
            />
          </label>
          <label>
            <span>Unit</span>
            <CfgSelect
              className="ua-cfg-tc-select"
              ariaLabel="Unit"
              value={unit}
              disabled={disabled}
              options={unitSelectOptions(unit)}
              onChange={(nextUnit) => onChange({ unit: nextUnit })}
            />
          </label>
          <label>
            <span>Bottle (Rs.)</span>
            <input
              type="text"
              inputMode="numeric"
              className="ua-cfg-tc-field"
              placeholder="e.g. 1249"
              value={price}
              disabled={disabled}
              onChange={(event) => onChange({ price: event.target.value.replace(/[^\d]/g, "") })}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function NutritionRow({
  item,
  editing,
  draft,
  previewUrl,
  locked,
  onDraftChange,
  onPickImage,
  onToggleLive,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}) {
  return (
    <article className={`ua-cfg-nb-row${editing ? " is-editing" : ""}${item.live ? "" : " is-hidden"}`}>
      <div className="ua-cfg-nb-row__summary">
        <div className="ua-cfg-nb-row__media">
          {item.image ? (
            <img src={item.image} alt="" />
          ) : (
            <span className="ua-cfg-nb-row__placeholder" aria-hidden="true">
              {String(item.name || "?").slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="ua-cfg-nb-row__copy">
          <div className="ua-cfg-nb-row__top">
            <strong>{item.name}</strong>
            <span className={`ua-cfg-faq__shown${item.live ? " is-on" : ""}`}>
              {item.live ? "LIVE" : "HIDDEN"}
            </span>
          </div>
          <p className="ua-cfg-nb-row__excerpt">
            {item.description && item.description !== item.name ? item.description : "No description yet"}
          </p>
          <div className="ua-cfg-nb-row__meta">
            <span>{item.pack || formatPack(item.packSize, item.unit) || "No pack size"}</span>
            <span aria-hidden="true">·</span>
            <span>Rs. {formatBottlePrice(item.price)}</span>
          </div>
        </div>
        <div className="ua-cfg-nb-row__actions">
          <button
            type="button"
            className={`ua-toggle ua-toggle--sm${item.live ? " ua-toggle--on" : ""}`}
            aria-pressed={item.live}
            aria-label={`${item.name} ${item.live ? "live" : "hidden"}`}
            disabled={locked}
            onClick={onToggleLive}
          >
            <span className="ua-toggle__knob" />
          </button>
          {editing ? (
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
              disabled={locked}
              onClick={onSave}
            >
              Save
            </button>
          ) : (
            <button
              type="button"
              className="ua-cfg-cr-link ua-cfg-cr-link--modify"
              disabled={locked}
              onClick={onEdit}
            >
              Edit
            </button>
          )}
          <button
            type="button"
            className={`ua-cfg-icon-btn${editing ? "" : " ua-cfg-icon-btn--danger"}`}
            aria-label={editing ? "Cancel" : `Delete ${item.name}`}
            disabled={locked}
            onClick={editing ? onCancel : onDelete}
          >
            ×
          </button>
        </div>
      </div>

      {editing ? (
        <div className="ua-cfg-nb-row__editor">
          <SupplementFormFields
            name={draft.name}
            description={draft.description}
            packSize={draft.packSize}
            unit={draft.unit}
            price={draft.price}
            previewUrl={previewUrl}
            disabled={locked}
            onChange={onDraftChange}
            onPickImage={onPickImage}
          />
          <div className="ua-cfg-dp-add__actions">
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={locked} onClick={onSave}>
              {locked ? "Saving…" : "Save nutrition"}
            </button>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" disabled={locked} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function NutritionBankSection({ items, setItems, onToast }) {
  const [draft, setDraft] = useState(emptyNutritionDraft);
  const [draftFile, setDraftFile] = useState(null);
  const [draftPreview, setDraftPreview] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyNutritionDraft);
  const [editFile, setEditFile] = useState(null);
  const [editPreview, setEditPreview] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: NUTRITION_BANK_PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const itemsRef = useRef(items);

  const { openPicker: openImagePicker, mediaPickerModal } = useMediaPicker({
    accept: "image",
    title: "Choose nutrition image",
    onFiles: (file, context) => {
      if (context === "edit") pickEditImage(file);
      else pickDraftImage(file);
    },
    onError: (error) => onToast?.(error?.message || "Could not attach media"),
  });

  const loadItems = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const { items: rows, pagination: nextPagination } = await adminListNutritionBank(null, {
        page: nextPage,
        limit: NUTRITION_BANK_PAGE_SIZE,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      const next = rows || [];
      setItems(next);
      itemsRef.current = next;
      setPagination({
        page: Number(nextPagination?.page) || nextPage,
        limit: Number(nextPagination?.limit) || NUTRITION_BANK_PAGE_SIZE,
        total: Number(nextPagination?.total) || next.length,
        pages: Number(nextPagination?.pages) || 1,
      });
    } catch (error) {
      onToast(error?.message || "Failed to load nutrition bank");
      setItems([]);
      itemsRef.current = [];
      setPagination({ page: 1, limit: NUTRITION_BANK_PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [onToast, page, search, setItems, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!loading && page > pagination.pages) setPage(pagination.pages);
  }, [loading, page, pagination.pages]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => () => {
    if (draftPreview.startsWith("blob:")) URL.revokeObjectURL(draftPreview);
  }, [draftPreview]);

  useEffect(() => () => {
    if (editPreview.startsWith("blob:")) URL.revokeObjectURL(editPreview);
  }, [editPreview]);

  function pickDraftImage(file) {
    setDraftPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return file instanceof File ? URL.createObjectURL(file) : "";
    });
    setDraftFile(file instanceof File ? file : null);
  }

  function resetAddForm() {
    setDraft(emptyNutritionDraft());
    pickDraftImage(null);
    setShowAddForm(false);
  }

  function openAddForm() {
    setDraft(emptyNutritionDraft());
    pickDraftImage(null);
    setShowAddForm(true);
  }

  function startEdit(item) {
    setShowAddForm(false);
    setEditingId(item.id);
    setEditDraft({
      name: item.name || "",
      description: item.description || "",
      packSize: item.packSize ? String(item.packSize) : "",
      unit: item.unit || "Caps",
      price: item.price ? String(item.price) : "",
    });
    setEditFile(null);
    setEditPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return item.image || "";
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(emptyNutritionDraft());
    setEditFile(null);
    setEditPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
  }

  function pickEditImage(file) {
    setEditPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return file instanceof File ? URL.createObjectURL(file) : "";
    });
    setEditFile(file instanceof File ? file : null);
  }

  async function persistItem(id, fields, file, successMessage) {
    setBusy(true);
    try {
      const updated = await adminUpdateNutritionBankItem(null, id, fields, file);
      if (!updated) throw new Error("Failed to save nutrition");
      setItems((prev) => {
        const next = prev.map((entry) => (entry.id === id ? { ...entry, ...updated } : entry));
        itemsRef.current = next;
        return next;
      });
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      onToast(error?.message || "Failed to save nutrition");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    const name = draft.name.trim();
    const description = draft.description.trim();
    const packSize = parsePackSize(draft.packSize);
    const unit = String(draft.unit || "").trim();
    const price = parseBottlePrice(draft.price);
    if (!name || !packSize || !unit || !price) {
      onToast("Name, pack size, unit and bottle price are required");
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateNutritionBankItem(
        null,
        { name, description: description || name, packSize, unit, price, live: true },
        draftFile,
      );
      if (!created) throw new Error("Failed to add nutrition");
      resetAddForm();
      onToast(`${name} added to the bank`);
      setPage(1);
      await loadItems(1);
    } catch (error) {
      onToast(error?.message || "Failed to add nutrition");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(item) {
    const name = editDraft.name.trim();
    const description = editDraft.description.trim();
    const packSize = parsePackSize(editDraft.packSize);
    const unit = String(editDraft.unit || "").trim();
    const price = parseBottlePrice(editDraft.price);
    if (!name || !packSize || !unit || !price) {
      onToast("Name, pack size, unit and bottle price are required");
      return;
    }
    const ok = await persistItem(
      item.id,
      { name, description: description || name, packSize, unit, price },
      editFile,
      "Nutrition saved",
    );
    if (ok) cancelEdit();
  }

  async function confirmDelete() {
    if (!pendingDelete || busy) return;
    const item = pendingDelete;
    setPendingDelete(null);
    if (editingId === item.id) cancelEdit();
    setBusy(true);
    try {
      await adminDeleteNutritionBankItem(null, item.id);
      onToast(`${item.name} removed`);
      const remaining = itemsRef.current.filter((entry) => entry.id !== item.id).length;
      if (remaining === 0 && page > 1) {
        const nextPage = page - 1;
        setPage(nextPage);
        await loadItems(nextPage);
      } else {
        await loadItems(page);
      }
    } catch (error) {
      onToast(error?.message || "Failed to delete nutrition");
    } finally {
      setBusy(false);
    }
  }

  const liveCount = items.filter((entry) => entry.live).length;
  const locked = busy || loading;

  return (
    <>
      <Panel
        className="ua-cfg-nb"
        title="Nutrition bank"
        subtitle={
          loading
            ? "Loading nutrition bank…"
            : "Admin and Support maintain pricing. Coaches pick nutritions from this bank for a client."
        }
        actions={
          loading ? null : (
            <>
              <span className="ua-cfg-dp__count">
                {liveCount} live of {pagination.total}
              </span>
              {!showAddForm ? (
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                  disabled={locked}
                  onClick={openAddForm}
                >
                  + Add nutrition
                </button>
              ) : null}
            </>
          )
        }
      >
        <div className="ua-cfg-tc-filters">
          <input
            type="search"
            className="ua-cfg-tc-field"
            placeholder="Search name or description"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <CfgSelect
            className="ua-cfg-tc-select"
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            ariaLabel="Filter by status"
            onChange={(value) => {
              setPage(1);
              setStatusFilter(value);
            }}
          />
        </div>

        {showAddForm ? (
          <Panel
            title="Add a nutrition"
            subtitle="Name it, set pack size and bottle price, then it joins the bank for every coach."
          >
            <div className="ua-cfg-nb-add">
              <SupplementFormFields
                name={draft.name}
                description={draft.description}
                packSize={draft.packSize}
                unit={draft.unit}
                price={draft.price}
                previewUrl={draftPreview}
                disabled={busy}
                onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
                onPickImage={() => openImagePicker("draft")}
              />
              <div className="ua-cfg-dp-add__actions">
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={addItem}>
                  {busy ? "Adding…" : "Add to bank"}
                </button>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" disabled={busy} onClick={resetAddForm}>
                  Cancel
                </button>
              </div>
            </div>
          </Panel>
        ) : null}

        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching nutritions from the server…</p>
        ) : items.length ? (
          <div className="ua-cfg-nb-list">
            {items.map((item) => (
              <NutritionRow
                key={item.id}
                item={item}
                editing={editingId === item.id}
                draft={editDraft}
                previewUrl={editPreview || item.image || ""}
                locked={busy}
                onDraftChange={(patch) => setEditDraft((current) => ({ ...current, ...patch }))}
                onPickImage={() => openImagePicker("edit")}
                onToggleLive={() => persistItem(
                  item.id,
                  { live: !item.live },
                  null,
                  item.live ? "Nutrition hidden" : "Nutrition is live",
                )}
                onEdit={() => startEdit(item)}
                onSave={() => saveEdit(item)}
                onCancel={cancelEdit}
                onDelete={() => setPendingDelete(item)}
              />
            ))}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">No nutritions in the bank yet. Add one below.</p>
        )}

        {!loading && pagination.total > 0 ? (
          <ListPagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={NUTRITION_BANK_PAGE_SIZE}
            onPageChange={setPage}
            label="Nutrition bank pagination"
          />
        ) : null}
      </Panel>

      {mediaPickerModal}

      <ConfirmDialog
        open={!!pendingDelete}
        tag="Delete nutrition"
        title={pendingDelete ? `Remove “${pendingDelete.name}”?` : ""}
        body="This will permanently remove the nutrition from the bank. You can’t undo this."
        cancelLabel="Keep nutrition"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

export { NUTRITION_BANK } from "../data/nutritionBankData.js";

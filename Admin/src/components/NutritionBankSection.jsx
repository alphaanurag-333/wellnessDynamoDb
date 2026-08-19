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

const IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/jpg";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Live" },
  { value: "inactive", label: "Hidden" },
];

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
  const inputRef = useRef(null);

  return (
    <button
      type="button"
      className={`ua-cfg-nb-uploader${previewUrl ? " has-image" : ""}`}
      disabled={disabled}
      aria-label={label}
      onClick={() => inputRef.current?.click()}
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
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          onPick(file);
        }}
      />
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
          <span>Name</span>
          <input
            type="text"
            className="ua-cfg-tc-field"
            placeholder="e.g. Omega-3 fish oil"
            value={name}
            disabled={disabled}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>
        <label className="ua-cfg-nb-form__desc">
          <span>Description</span>
          <textarea
            className="ua-cfg-nb-textarea"
            rows={3}
            placeholder="Short note coaches will see"
            value={description}
            disabled={disabled}
            onChange={(event) => onChange({ description: event.target.value })}
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

function NutritionEditModal({ item, busy, onClose, onSave, onToggleLive, onDelete, onToast }) {
  const [draft, setDraft] = useState(() => ({
    name: item.name || "",
    description: item.description || "",
    packSize: item.packSize ? String(item.packSize) : "",
    unit: item.unit || "Caps",
    price: item.price ? String(item.price) : "",
  }));
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(item.image || "");

  useEffect(() => {
    setDraft({
      name: item.name || "",
      description: item.description || "",
      packSize: item.packSize ? String(item.packSize) : "",
      unit: item.unit || "Caps",
      price: item.price ? String(item.price) : "",
    });
    setFile(null);
    setPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return item.image || "";
    });
  }, [item.id, item.name, item.description, item.packSize, item.unit, item.price, item.image]);

  useEffect(() => () => {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  function pickImage(nextFile) {
    if (!(nextFile instanceof File)) return;
    setPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(nextFile);
    });
    setFile(nextFile);
  }

  async function save() {
    const name = draft.name.trim();
    const packSize = parsePackSize(draft.packSize);
    const unit = String(draft.unit || "").trim();
    const price = parseBottlePrice(draft.price);
    if (!name || !packSize || !unit || !price) {
      onToast("Name, pack size, unit and bottle price are required");
      return false;
    }
    return onSave(
      {
        name,
        description: draft.description.trim() || name,
        packSize,
        unit,
        price,
      },
      file,
      "Supplement saved",
    );
  }

  return (
    <div className="ua-cp-modal-backdrop ua-cfg-nb-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ua-cfg-dp-modal ua-cfg-nb-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="ua-cfg-nb-modal-title"
      >
        <div className="ua-cfg-dp-modal__head">
          <div>
            <h3 id="ua-cfg-nb-modal-title" className="ua-cfg-dp-modal__title">{item.name}</h3>
            <p className="ua-cfg-dp-modal__sub">Supplement · nutrition bank</p>
          </div>
          <div className="ua-cfg-dp-modal__actions">
            <span className="ua-cfg-dp-modal__live-label">Live</span>
            <button
              type="button"
              className={`ua-toggle ua-toggle--sm${item.live ? " ua-toggle--on" : ""}`}
              aria-pressed={item.live}
              disabled={busy}
              onClick={() => onToggleLive(!item.live)}
            >
              <span className="ua-toggle__knob" />
            </button>
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-dp-modal__delete"
              disabled={busy}
              onClick={() => onDelete(item)}
            >
              Delete
            </button>
            <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="ua-cfg-nb-modal__body">
          <SupplementFormFields
            name={draft.name}
            description={draft.description}
            packSize={draft.packSize}
            unit={draft.unit}
            price={draft.price}
            previewUrl={preview}
            disabled={busy}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
            onPickImage={pickImage}
          />
        </div>

        <div className="ua-cfg-nb-modal__foot">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save supplement"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function NutritionBankSection({ items, setItems, onToast }) {
  const [draft, setDraft] = useState(emptyNutritionDraft);
  const [draftFile, setDraftFile] = useState(null);
  const [draftPreview, setDraftPreview] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
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

  const selectedItem = items.find((entry) => entry.id === selectedId) ?? null;

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

  async function persistItem(id, fields, file, successMessage) {
    setBusy(true);
    try {
      const updated = await adminUpdateNutritionBankItem(null, id, fields, file);
      if (!updated) throw new Error("Failed to save supplement");
      setItems((prev) => {
        const next = prev.map((entry) => (entry.id === id ? { ...entry, ...updated } : entry));
        itemsRef.current = next;
        return next;
      });
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      onToast(error?.message || "Failed to save supplement");
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
      if (!created) throw new Error("Failed to add supplement");
      resetAddForm();
      onToast(`${name} added to the bank`);
      setPage(1);
      await loadItems(1);
    } catch (error) {
      onToast(error?.message || "Failed to add supplement");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || busy) return;
    const item = pendingDelete;
    setPendingDelete(null);
    if (selectedId === item.id) setSelectedId(null);
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
      onToast(error?.message || "Failed to delete supplement");
    } finally {
      setBusy(false);
    }
  }

  const liveCount = items.filter((entry) => entry.live).length;

  return (
    <>
      <Panel
        className="ua-cfg-nb"
        title="Nutrition bank"
        subtitle={
          loading
            ? "Loading nutrition bank…"
            : "Admin and Support maintain pricing. Coaches pick supplements from this bank for a client."
        }
        actions={
          loading ? null : (
            <span className="ua-cfg-dp__count">
              {liveCount} live of {pagination.total}
            </span>
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

        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching supplements from the server…</p>
        ) : items.length ? (
          <div className="ua-cfg-nb-grid">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`ua-cfg-nb-card${selectedId === item.id ? " is-selected" : ""}${item.live ? "" : " is-hidden"}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="ua-cfg-nb-card__media">
                  {item.image ? (
                    <img src={item.image} alt="" />
                  ) : (
                    <span className="ua-cfg-nb-card__placeholder" aria-hidden="true">
                      {String(item.name || "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="ua-cfg-nb-card__body">
                  <div className="ua-cfg-nb-card__top">
                    <strong>{item.name}</strong>
                    {item.live ? (
                      <span className="ua-cfg-nb-card__live">Live</span>
                    ) : (
                      <span className="ua-cfg-nb-card__hidden">Hidden</span>
                    )}
                  </div>
                  <p className="ua-cfg-nb-card__excerpt">
                    {item.description && item.description !== item.name ? item.description : "No description yet"}
                  </p>
                  <div className="ua-cfg-nb-card__meta">
                    <span>{item.pack || formatPack(item.packSize, item.unit) || "No pack size"}</span>
                    <span aria-hidden="true">·</span>
                    <span>Rs. {formatBottlePrice(item.price)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">No supplements in the bank yet. Add one below.</p>
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

      <Panel
        title="Add a supplement"
        subtitle="Name it, set pack size and bottle price, then it joins the bank for every coach."
        actions={
          !showAddForm ? (
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--outline"
              disabled={busy || loading}
              onClick={() => setShowAddForm(true)}
            >
              + New supplement
            </button>
          ) : null
        }
      >
        {showAddForm ? (
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
              onPickImage={pickDraftImage}
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
        ) : null}
      </Panel>

      {selectedItem ? (
        <NutritionEditModal
          item={selectedItem}
          busy={busy}
          onClose={() => setSelectedId(null)}
          onSave={(fields, file, message) => persistItem(selectedItem.id, fields, file, message)}
          onToggleLive={(live) => persistItem(
            selectedItem.id,
            { live },
            null,
            live ? "Supplement is live" : "Supplement hidden",
          )}
          onDelete={(item) => setPendingDelete(item)}
          onToast={onToast}
        />
      ) : null}

      <ConfirmDialog
        open={!!pendingDelete}
        tag="Delete supplement"
        title={pendingDelete ? `Remove “${pendingDelete.name}”?` : ""}
        body="This will permanently remove the supplement from the bank. You can’t undo this."
        cancelLabel="Keep supplement"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

export { NUTRITION_BANK } from "../data/nutritionBankData.js";

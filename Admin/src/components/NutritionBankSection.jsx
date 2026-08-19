import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminCreateNutritionBankItem,
  adminDeleteNutritionBankItem,
  adminListNutritionBank,
  adminUpdateNutritionBankItem,
} from "../api/nutritionBankApi.js";
import {
  emptyNutritionDraft,
  NUTRITION_BANK_PAGE_SIZE,
  parseBottlePrice,
  parsePackSize,
  unitOptionsFor,
} from "../data/nutritionBankData.js";
import { CfgSelect, ListPagination } from "./shared.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/jpg";

function snapshotItem(item) {
  return {
    name: String(item?.name || "").trim(),
    description: String(item?.description || "").trim(),
    packSize: Number(item?.packSize) || 0,
    unit: String(item?.unit || "").trim(),
    price: Number(item?.price) || 0,
    status: item?.status === "inactive" ? "inactive" : "active",
    image: item?.image || "",
  };
}

function sameSnapshot(a, b) {
  return (
    a.name === b.name &&
    a.description === b.description &&
    a.packSize === b.packSize &&
    a.unit === b.unit &&
    a.price === b.price &&
    a.status === b.status
  );
}

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
      className={`ua-cfg-nb-thumb${previewUrl ? " has-image" : ""}`}
      disabled={disabled}
      aria-label={label}
      onClick={() => inputRef.current?.click()}
    >
      {previewUrl ? <img src={previewUrl} alt="" /> : <span>+</span>}
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

export function NutritionBankSection({ items, setItems, onToast }) {
  const [draft, setDraft] = useState(emptyNutritionDraft);
  const [draftFile, setDraftFile] = useState(null);
  const [draftPreview, setDraftPreview] = useState("");
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
  const savedRef = useRef({});
  const itemsRef = useRef(items);

  const rememberSaved = useCallback((rows) => {
    savedRef.current = Object.fromEntries((rows || []).map((row) => [row.id, snapshotItem(row)]));
  }, []);

  const loadItems = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const { items: rows, pagination: nextPagination } = await adminListNutritionBank(null, {
        page: nextPage,
        limit: NUTRITION_BANK_PAGE_SIZE,
      });
      const next = rows || [];
      setItems(next);
      itemsRef.current = next;
      rememberSaved(next);
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
      rememberSaved([]);
      setPagination({ page: 1, limit: NUTRITION_BANK_PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [onToast, page, rememberSaved, setItems]);

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

  function updateItem(id, patch) {
    setItems((prev) => {
      const next = prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
      itemsRef.current = next;
      return next;
    });
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
      savedRef.current[id] = snapshotItem(updated);
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      onToast(error?.message || "Failed to save supplement");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function commitItem(id) {
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item?.id || busy) return;
    const next = {
      name: String(item.name || "").trim(),
      description: String(item.description || "").trim(),
      packSize: Number(item.packSize) || 0,
      unit: String(item.unit || "").trim(),
      price: Number(item.price) || 0,
      status: item.status === "inactive" ? "inactive" : "active",
    };
    const saved = savedRef.current[item.id] || snapshotItem(item);

    if (!next.name || !next.unit || !next.packSize || !next.price) {
      updateItem(item.id, saved);
      onToast("Name, pack size, unit and bottle price are required");
      return;
    }
    if (!next.description) next.description = next.name;
    if (sameSnapshot(saved, next)) {
      if (item.name !== next.name || item.description !== next.description) updateItem(item.id, next);
      return;
    }

    const ok = await persistItem(item.id, next);
    if (!ok) updateItem(item.id, saved);
  }

  async function changeUnit(item, unit) {
    updateItem(item.id, { unit });
    if (busy) return;
    const ok = await persistItem(item.id, { unit });
    if (!ok) updateItem(item.id, savedRef.current[item.id] || snapshotItem(item));
  }

  async function toggleLive(item) {
    if (busy) return;
    const live = !item.live;
    updateItem(item.id, { live, status: live ? "active" : "inactive" });
    const ok = await persistItem(item.id, { live });
    if (!ok) updateItem(item.id, savedRef.current[item.id] || snapshotItem(item));
  }

  async function changeImage(item, file) {
    if (!(file instanceof File) || busy) return;
    await persistItem(item.id, {}, file, "Image updated");
  }

  function pickDraftImage(file) {
    if (draftPreview.startsWith("blob:")) URL.revokeObjectURL(draftPreview);
    setDraftFile(file instanceof File ? file : null);
    setDraftPreview(file instanceof File ? URL.createObjectURL(file) : "");
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
      setDraft(emptyNutritionDraft());
      pickDraftImage(null);
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

  const locked = busy || loading;
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
              {liveCount} live on this page · {pagination.total} in bank
            </span>
          )
        }
      >
        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching supplements from the server…</p>
        ) : (
          <div className="ua-cfg-nb-table-wrap">
            <table className="ua-cfg-nb-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Supplement</th>
                  <th>Pack size</th>
                  <th>Unit</th>
                  <th>Bottle (Rs.)</th>
                  <th>Live</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                <tr className="ua-cfg-nb-add-row">
                  <td data-label="Image">
                    <ImagePicker
                      previewUrl={draftPreview}
                      disabled={locked}
                      label="Upload supplement image"
                      onPick={pickDraftImage}
                    />
                  </td>
                  <td data-label="Supplement">
                    <div className="ua-cfg-nb-add__copy">
                      <input
                        type="text"
                        className="ua-cfg-nb-add__input"
                        placeholder="Supplement name"
                        value={draft.name}
                        disabled={locked}
                        onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                      />
                      <input
                        type="text"
                        className="ua-cfg-nb-add__input"
                        placeholder="Description"
                        value={draft.description}
                        disabled={locked}
                        onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                      />
                    </div>
                  </td>
                  <td data-label="Pack size">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="ua-cfg-nb-add__input ua-cfg-nb-add__pack"
                      placeholder="Pack"
                      value={draft.packSize}
                      disabled={locked}
                      onChange={(event) => setDraft({ ...draft, packSize: event.target.value.replace(/[^\d]/g, "") })}
                    />
                  </td>
                  <td data-label="Unit">
                    <CfgSelect
                      className="ua-cfg-nb-add__unit"
                      ariaLabel="Unit"
                      value={draft.unit}
                      disabled={locked}
                      options={unitSelectOptions(draft.unit)}
                      onChange={(unit) => setDraft({ ...draft, unit })}
                    />
                  </td>
                  <td data-label="Bottle (Rs.)">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="ua-cfg-nb-add__input ua-cfg-nb-add__input--price"
                      placeholder="Rs."
                      value={draft.price}
                      disabled={locked}
                      onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                    />
                  </td>
                  <td colSpan={2}>
                    <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={locked} onClick={addItem}>
                      + Add supplement
                    </button>
                  </td>
                </tr>
                {items.map((item) => (
                  <tr key={item.id} className={item.live ? "" : "is-hidden"}>
                    <td data-label="Image">
                      <ImagePicker
                        previewUrl={item.image}
                        disabled={locked}
                        label={`Change image for ${item.name}`}
                        onPick={(file) => changeImage(item, file)}
                      />
                    </td>
                    <td data-label="Supplement">
                      <input
                        type="text"
                        className="ua-cfg-nb-table__name"
                        value={item.name}
                        disabled={locked}
                        aria-label={`Supplement name for ${item.name}`}
                        onChange={(event) => updateItem(item.id, { name: event.target.value })}
                        onBlur={() => commitItem(item.id)}
                      />
                      <input
                        type="text"
                        className="ua-cfg-nb-table__desc"
                        value={item.description}
                        disabled={locked}
                        aria-label={`Description for ${item.name}`}
                        placeholder="Description"
                        onChange={(event) => updateItem(item.id, { description: event.target.value })}
                        onBlur={() => commitItem(item.id)}
                      />
                    </td>
                    <td data-label="Pack size">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="ua-cfg-nb-table__pack"
                        value={item.packSize || ""}
                        disabled={locked}
                        aria-label={`Pack size for ${item.name}`}
                        onChange={(event) => updateItem(item.id, { packSize: parsePackSize(event.target.value) })}
                        onBlur={() => commitItem(item.id)}
                      />
                    </td>
                    <td data-label="Unit">
                      <CfgSelect
                        className="ua-cfg-nb-table__unit"
                        ariaLabel={`Unit for ${item.name}`}
                        value={item.unit}
                        disabled={locked}
                        options={unitSelectOptions(item.unit)}
                        onChange={(unit) => changeUnit(item, unit)}
                      />
                    </td>
                    <td data-label="Bottle (Rs.)">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="ua-cfg-nb-table__price"
                        value={item.price || ""}
                        disabled={locked}
                        aria-label={`Bottle price for ${item.name}`}
                        onChange={(event) => updateItem(item.id, { price: parseBottlePrice(event.target.value) })}
                        onBlur={() => commitItem(item.id)}
                      />
                    </td>
                    <td data-label="Live">
                      <button
                        type="button"
                        className={`ua-toggle ua-toggle--sm${item.live ? " ua-toggle--on" : ""}`}
                        aria-pressed={item.live}
                        aria-label={`${item.live ? "Hide" : "Show"} ${item.name}`}
                        disabled={locked}
                        onClick={() => toggleLive(item)}
                      >
                        <span className="ua-toggle__knob" />
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ua-cfg-icon-btn ua-cfg-nb-table__delete"
                        aria-label={`Remove ${item.name}`}
                        disabled={locked}
                        onClick={() => setPendingDelete(item)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !items.length ? (
          <p className="ua-cfg-panel__sub">No supplements in the bank yet. Use the row above to add one.</p>
        ) : null}

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

import { useCallback, useEffect, useState } from "react";
import {
  adminCreateCoupon,
  adminDeleteCoupon,
  adminListCoupons,
  adminUpdateCoupon,
} from "../api/couponsApi.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { CfgSelect } from "./shared.jsx";

const EMPTY = {
  title: "",
  couponCode: "",
  discountType: "percentage",
  value: "",
  status: "active",
  appliesTo: ["challenge"],
};

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div className="ua-cfg-panel__copy">
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function CouponsSection({ onToast }) {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminListCoupons(null, { limit: 200 });
      setItems(result?.items || []);
    } catch (err) {
      onToast?.(err.message || "Failed to load coupons", "error");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const closeForm = () => {
    setDraft(EMPTY);
    setEditingId(null);
    setFormOpen(false);
  };

  const openCreate = () => {
    setDraft(EMPTY);
    setEditingId(null);
    setFormOpen(true);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      couponCode: item.couponCode,
      discountType: item.discountType,
      value: String(item.value),
      status: item.status,
      appliesTo: item.appliesTo,
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!draft.title.trim() || !draft.couponCode.trim()) {
      onToast?.("Title and code are required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: draft.title.trim(),
        couponCode: draft.couponCode.trim().toUpperCase(),
        discountType: draft.discountType,
        value: Number(draft.value) || 0,
        status: draft.status,
        appliesTo: ["challenge"],
        challengeIds: [],
      };
      if (editingId) {
        await adminUpdateCoupon(null, editingId, payload);
        onToast?.("Coupon updated", "success");
      } else {
        await adminCreateCoupon(null, payload);
        onToast?.("Coupon created", "success");
      }
      closeForm();
      await load();
    } catch (err) {
      onToast?.(err.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Panel
        title="Coupons"
        subtitle={
          loading
            ? "Loading…"
            : `${items.length} coupon${items.length === 1 ? "" : "s"} · challenge checkout discounts`
        }
        actions={
          formOpen ? null : (
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={openCreate}>
              + Add New
            </button>
          )
        }
      >
        {formOpen ? (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                  {editingId ? "Edit coupon" : "New coupon"}
                </h4>
                <p className="ua-cfg-panel__sub" style={{ marginTop: 4 }}>
                  Challenge checkout coupons (percentage or fixed).
                </p>
              </div>
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--ghost"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                <span>Title</span>
                <input
                  className="ua-cfg-tc-field"
                  value={draft.title}
                  disabled={saving}
                  placeholder="e.g. Launch offer"
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                />
              </label>
              <label>
                <span>Code</span>
                <input
                  className="ua-cfg-tc-field"
                  value={draft.couponCode}
                  disabled={saving}
                  placeholder="SAVE20"
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, couponCode: e.target.value.toUpperCase() }))
                  }
                />
              </label>
              <label>
                <span>Type</span>
                <CfgSelect
                  className="ua-cfg-tc-select"
                  value={draft.discountType}
                  disabled={saving}
                  options={[
                    { value: "percentage", label: "Percentage" },
                    { value: "fixed", label: "Fixed (₹)" },
                  ]}
                  onChange={(discountType) => setDraft((p) => ({ ...p, discountType }))}
                />
              </label>
              <label>
                <span>Value</span>
                <input
                  className="ua-cfg-tc-field"
                  inputMode="decimal"
                  value={draft.value}
                  disabled={saving}
                  placeholder={draft.discountType === "percentage" ? "20" : "100"}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, value: e.target.value.replace(/[^\d.]/g, "") }))
                  }
                />
              </label>
              <label>
                <span>Status</span>
                <CfgSelect
                  className="ua-cfg-tc-select"
                  value={draft.status}
                  disabled={saving}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  onChange={(status) => setDraft((p) => ({ ...p, status }))}
                />
              </label>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--outline"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--primary"
                disabled={saving}
                onClick={save}
              >
                {saving ? "Saving…" : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <div>
                  <strong>{item.couponCode}</strong> — {item.title}
                  <div className="ua-cfg-panel__sub">
                    {item.discountType === "percentage" ? `${item.value}%` : `₹${item.value}`} ·{" "}
                    {item.status}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--sm ua-cfg-btn--ghost"
                    onClick={() => startEdit(item)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--sm ua-cfg-btn--outline"
                    onClick={() => setDeleteId(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!loading && !items.length ? (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <p className="ua-cfg-panel__sub" style={{ marginBottom: 12 }}>
                  No coupons yet.
                </p>
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={openCreate}>
                  + Add New
                </button>
              </div>
            ) : null}
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete coupon?"
        body="This coupon will no longer apply at checkout."
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          try {
            await adminDeleteCoupon(null, deleteId);
            onToast?.("Coupon deleted", "success");
            setDeleteId(null);
            await load();
          } catch (err) {
            onToast?.(err.message || "Delete failed", "error");
          }
        }}
      />
    </>
  );
}

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

function Panel({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
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
        className="ua-cfg-cpn ua-cfg-faq-shell"
        title="Coupons"
        subtitle={
          loading
            ? "Loading…"
            : `${items.length} coupon${items.length === 1 ? "" : "s"} · challenge checkout discounts`
        }
        actions={
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-faq-add"
            disabled={saving || loading}
            onClick={openCreate}
          >
            + Add coupon
          </button>
        }
      >
        {formOpen ? (
          <section className="ua-cfg-faq-new ua-cfg-cpn-form">
            <div className="ua-cfg-faq-new__head">
              <h4 className="ua-cfg-faq-new__title">
                <span aria-hidden="true">🎟</span> {editingId ? "Edit coupon" : "New coupon"}
              </h4>
              <button
                type="button"
                className="ua-cfg-icon-btn"
                aria-label="Close"
                onClick={closeForm}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <div className="ua-cfg-cpn-form__grid">
              <label className="ua-cfg-cpn-field">
                <span>Title</span>
                <input
                  className="ua-cfg-faq-new__question"
                  value={draft.title}
                  disabled={saving}
                  placeholder="e.g. Launch offer"
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                />
              </label>
              <label className="ua-cfg-cpn-field">
                <span>Code</span>
                <input
                  className="ua-cfg-faq-new__question"
                  value={draft.couponCode}
                  disabled={saving}
                  placeholder="SAVE20"
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, couponCode: e.target.value.toUpperCase() }))
                  }
                />
              </label>
              <label className="ua-cfg-cpn-field">
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
              <label className="ua-cfg-cpn-field">
                <span>Value</span>
                <input
                  className="ua-cfg-faq-new__question"
                  inputMode="decimal"
                  value={draft.value}
                  disabled={saving}
                  placeholder={draft.discountType === "percentage" ? "20" : "100"}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, value: e.target.value.replace(/[^\d.]/g, "") }))
                  }
                />
              </label>
              <label className="ua-cfg-cpn-field">
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

            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--primary"
              disabled={saving}
              onClick={save}
            >
              {saving ? "Saving…" : editingId ? "Save" : "Add coupon"}
            </button>
          </section>
        ) : null}

        <div className="ua-cfg-faq-list ua-cfg-cpn-list">
          {items.map((item) => (
            <article key={item.id} className="ua-cfg-cpn-list__item">
              <div className="ua-cfg-cpn-list__copy">
                <p className="ua-cfg-cpn-list__title">
                  <strong>{item.couponCode}</strong>
                  <span> — {item.title}</span>
                </p>
                <p className="ua-cfg-panel__sub ua-cfg-cpn-list__meta">
                  {item.discountType === "percentage" ? `${item.value}%` : `₹${item.value}`} ·{" "}
                  {item.status}
                </p>
              </div>
              <div className="ua-cfg-cpn-list__actions">
                <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                  onClick={() => startEdit(item)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="ua-cfg-icon-btn ua-cfg-icon-btn--danger"
                  aria-label={`Delete ${item.couponCode}`}
                  onClick={() => setDeleteId(item.id)}
                >
                  ×
                </button>
              </div>
            </article>
          ))}
          {!loading && !items.length && !formOpen ? (
            <div className="ua-cfg-cpn-empty">
              <p className="ua-cfg-panel__sub">No coupons yet.</p>
            </div>
          ) : null}
        </div>
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

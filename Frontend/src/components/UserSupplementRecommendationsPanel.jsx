import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { fetchActiveSupplementCatalog } from "../wellnessCoach/api/coachSupplementCatalog.js";

function formatRupee(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatAssignedDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function deliveryOptionLabel(option) {
  if (option === "self_billing") return "Self Billing (upload bill)";
  return "Request delivery from coach";
}

function RecommendationHistoryCard({ recommendation, onRemove, removing, canRemove }) {
  const id = recommendation.id || recommendation._id;

  return (
    <article className="assignment-card">
      <div className="assignment-card__header">
        <div className="assignment-card__header-main">
          <div>
            <div className="diet-plan-card__title">
              {formatRupee(recommendation.billingTotal)}
            </div>
            <div className="diet-plan-card__date">
              {deliveryOptionLabel(recommendation.deliveryOption)}
              {recommendation.createdAt
                ? ` · ${formatAssignedDate(recommendation.createdAt)}`
                : ""}
            </div>
          </div>
        </div>
        {canRemove ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm text-danger"
            onClick={() => onRemove(recommendation)}
            disabled={removing}
          >
            Remove
          </button>
        ) : null}
      </div>
      <div className="assignment-card__body">
        <ul className="mb-2">
          {(recommendation.items || []).map((item) => (
            <li key={`${id}-${item.supplementId}`}>
              {item.name} · {item.packSize} {item.unit} · Qty {item.qty} ·{" "}
              {formatRupee((item.price || 0) * (item.qty || 0))}
            </li>
          ))}
        </ul>
        {recommendation.deliveryOption === "coach_delivery" && recommendation.deliveryRequestedAt ? (
          <div className="assignment-card__note text-success">
            Delivery requested on {formatAssignedDate(recommendation.deliveryRequestedAt)}
          </div>
        ) : null}
        {recommendation.deliveryOption === "self_billing" && recommendation.billUploadedAt ? (
          <div className="assignment-card__note">
            Bill uploaded on {formatAssignedDate(recommendation.billUploadedAt)}
            {recommendation.billPdfUrl ? (
              <>
                {" "}
                ·{" "}
                <a href={recommendation.billPdfUrl} target="_blank" rel="noopener noreferrer">
                  View PDF
                </a>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function UserSupplementRecommendationsPanel({
  token,
  userId,
  api,
  backTo,
  PageLoader,
  NotFoundPage,
  onUnauthorized,
  readOnly = false,
}) {
  const [catalog, setCatalog] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({});
  const [deliveryOption, setDeliveryOption] = useState("coach_delivery");

  const loadData = useCallback(async () => {
    if (!token || !userId) return;
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const [catalogRes, recRes] = await Promise.all([
        fetchActiveSupplementCatalog(),
        api.list(token, userId),
      ]);
      setCatalog(catalogRes.supplements ?? []);
      setRecommendations(recRes.recommendations ?? []);
    } catch (e) {
      if (e?.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (e?.status === 404) {
        setNotFound(true);
        return;
      }
      setError(e.message || "Failed to load supplement recommendations.");
    } finally {
      setLoading(false);
    }
  }, [api, onUnauthorized, token, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = catalog;
    if (q) {
      rows = rows.filter((row) =>
        [row.name, row.description, row.unit].filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [catalog, search]);

  const selectedItems = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([supplementId, qty]) => {
          const row = catalog.find((s) => (s.id || s._id) === supplementId);
          return row ? { supplementId, qty: Number(qty), row } : null;
        })
        .filter(Boolean),
    [catalog, selected]
  );

  const billingTotal = useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) => sum + (Number(item.row.price) || 0) * (Number(item.qty) || 0),
        0
      ),
    [selectedItems]
  );

  const toggleSelect = (supplementId) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[supplementId]) {
        delete next[supplementId];
      } else {
        next[supplementId] = 1;
      }
      return next;
    });
  };

  const setQty = (supplementId, qty) => {
    const value = Math.max(1, Number(qty) || 1);
    setSelected((prev) => ({ ...prev, [supplementId]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!token || !userId || readOnly) return;
    if (!selectedItems.length) {
      await Swal.fire({ icon: "warning", title: "Select at least one supplement." });
      return;
    }

    setSaving(true);
    try {
      await api.create(token, userId, {
        items: selectedItems.map((item) => ({
          supplementId: item.supplementId,
          qty: item.qty,
        })),
        deliveryOption,
      });
      await Swal.fire({
        icon: "success",
        title: "Recommendation created",
        timer: 1500,
        showConfirmButton: false,
      });
      setSelected({});
      setSearch("");
      await loadData();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else {
        await Swal.fire({
          icon: "error",
          title: "Create failed",
          text: err.message || "Could not create recommendation.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (recommendation) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Remove recommendation?",
      text: "This recommendation will be deleted for the client.",
      showCancelButton: true,
      confirmButtonText: "Remove",
    });
    if (!confirm.isConfirmed) return;

    const recommendationId = recommendation.id || recommendation._id;
    setRemovingId(recommendationId);
    try {
      await api.remove(token, userId, recommendationId);
      await Swal.fire({ icon: "success", title: "Removed", timer: 1200, showConfirmButton: false });
      await loadData();
    } catch (err) {
      if (err?.status === 401) onUnauthorized?.();
      else {
        await Swal.fire({
          icon: "error",
          title: "Remove failed",
          text: err.message || "Could not remove recommendation.",
        });
      }
    } finally {
      setRemovingId("");
    }
  };

  if (loading) return <PageLoader />;
  if (notFound) return <NotFoundPage />;

  const embedded = !backTo;

  return (
    <div className={embedded ? "client-hub-embedded-panel" : "page-card"}>
      {embedded ? (
        <div className="client-hub-embedded-panel__header">
          <h2 className="client-hub-embedded-panel__title">Supplement Recommendations</h2>
          <p className="client-hub-embedded-panel__subtitle">
            Recommend supplements from the admin catalog and choose how the client can proceed.
          </p>
        </div>
      ) : (
        <div className="page-card__header">
          <div>
            <Link to={backTo} className="btn btn--ghost btn--sm mb-2">
              ← Back to clients
            </Link>
            <h1 className="page-card__title">Supplement Recommendations</h1>
            <p className="page-card__subtitle">
              Recommend supplements from the admin catalog and choose how the client can proceed.
            </p>
          </div>
        </div>
      )}

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!readOnly ? (
        <form className={`form-card mb-4${embedded ? " form-card--embedded" : ""}`} onSubmit={handleCreate}>
          <h2 className="form-card__title">New recommendation</h2>

          <div className="supplement-delivery-options">
            <div className="supplement-delivery-options__main">
              <span className="user-field__label">Delivery option for client</span>
              <div className="supplement-delivery-options__choices">
              <label className={`supplement-delivery-options__choice${deliveryOption === "coach_delivery" ? " supplement-delivery-options__choice--active" : ""}`}>
                <input
                  type="radio"
                  name="deliveryOption"
                  value="coach_delivery"
                  checked={deliveryOption === "coach_delivery"}
                  onChange={() => setDeliveryOption("coach_delivery")}
                />
                Request delivery from coach
              </label>
              <label className={`supplement-delivery-options__choice${deliveryOption === "self_billing" ? " supplement-delivery-options__choice--active" : ""}`}>
                <input
                  type="radio"
                  name="deliveryOption"
                  value="self_billing"
                  checked={deliveryOption === "self_billing"}
                  onChange={() => setDeliveryOption("self_billing")}
                />
                Self billing (upload bill PDF)
              </label>
            </div>
            </div>
            <div className="supplement-delivery-options__preview">
              Billing preview: <strong>{formatRupee(billingTotal)}</strong>
            </div>
          </div>

          <div className="catalog-picker__toolbar">
            <input
              type="search"
              className="form-control"
              placeholder="Search supplements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="catalog-picker">
            <div className="catalog-picker__grid">
              {filteredCatalog.map((supplement) => {
              const id = supplement.id || supplement._id;
              const isSelected = Boolean(selected[id]);
              return (
                <div
                  key={id}
                  className={`catalog-picker__card${isSelected ? " catalog-picker__card--selected" : ""}`}
                >
                  <button
                    type="button"
                    className="catalog-picker__card-head"
                    onClick={() => toggleSelect(id)}
                  >
                    <span className="catalog-picker__card-name">{supplement.name}</span>
                    <span className="catalog-picker__card-meta">
                      {supplement.packSize} {supplement.unit} · {formatRupee(supplement.price)}
                    </span>
                  </button>
                  {isSelected ? (
                    <div className="mt-2">
                      <label className="user-field__label">Qty</label>
                      <input
                        type="number"
                        min={1}
                        className="form-control"
                        value={selected[id] || 1}
                        onChange={(e) => setQty(id, e.target.value)}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
            </div>
            {filteredCatalog.length === 0 ? (
              <p className="catalog-picker__empty">No supplements match your search.</p>
            ) : null}
          </div>

          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Saving..." : "Create recommendation"}
          </button>
        </form>
      ) : null}

      <h2 className="form-card__title">Recommendation history</h2>
      {recommendations.length === 0 ? (
        <p className="text-muted">No supplement recommendations yet.</p>
      ) : (
        <div className="d-flex flex-column gap-3">
          {recommendations.map((recommendation) => (
            <RecommendationHistoryCard
              key={recommendation.id || recommendation._id}
              recommendation={recommendation}
              onRemove={handleRemove}
              removing={removingId === (recommendation.id || recommendation._id)}
              canRemove={!readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

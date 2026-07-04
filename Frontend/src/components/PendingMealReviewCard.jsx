import { useState } from "react";

const CATEGORY_LABELS = {
  functional_juice: "Functional Juice",
  salad: "Salad",
  meal: "Meal",
  beverage: "Beverage",
  snacks: "Snacks",
  protein: "Protein",
};

const MACRO_FIELDS = [
  { key: "protein", label: "Protein (g)", color: "#f97316" },
  { key: "fats", label: "Fats (g)", color: "#a855f7" },
  { key: "carbs", label: "Carbs (g)", color: "#3b82f6" },
  { key: "calories", label: "Calories (kcal)", color: "#ca8a04" },
];

export function PendingMealReviewCard({ log, onReview, reviewing }) {
  const [proteinGm, setProteinGm] = useState(String(log.proteinGm ?? 20));
  const [fatsGm, setFatsGm] = useState(String(log.fatsGm ?? 10));
  const [carbsGm, setCarbsGm] = useState(String(log.carbsGm ?? 30));
  const [caloriesKcal, setCaloriesKcal] = useState(String(log.caloriesKcal ?? 250));
  const [rejectionReason, setRejectionReason] = useState("");

  const macroValues = {
    protein: { val: proteinGm, set: setProteinGm },
    fats: { val: fatsGm, set: setFatsGm },
    carbs: { val: carbsGm, set: setCarbsGm },
    calories: { val: caloriesKcal, set: setCaloriesKcal },
  };

  const buildPayload = (status) => ({
    status,
    proteinGm: parseFloat(proteinGm) || 0,
    fatsGm: parseFloat(fatsGm) || 0,
    carbsGm: parseFloat(carbsGm) || 0,
    caloriesKcal: parseFloat(caloriesKcal) || 0,
    ...(status === "rejected" && rejectionReason.trim()
      ? { rejectionReason: rejectionReason.trim() }
      : {}),
  });

  return (
    <article className="mt-pending-card">
      <div className="mt-pending-card__header">
        <div className="mt-pending-card__intro">
          <h3 className="mt-pending-card__title">{log.userName || "Client"}</h3>
          <p className="mt-pending-card__meta">
            {CATEGORY_LABELS[log.category] || log.category}
            {log.mealType ? ` · ${log.mealType}` : ""}
            {log.entryTime ? ` · ${log.entryTime}` : ""}
            {log.date ? ` · ${log.date}` : ""}
          </p>
        </div>
        <span className="mt-pending-card__badge">Pending review</span>
      </div>

      {log.description ? <p className="mt-pending-card__desc">{log.description}</p> : null}

      {log.items?.length > 0 ? (
        <div className="mt-log-card__items">
          {log.items.map((item, index) => (
            <span key={`${item.name}-${index}`} className="mt-item-chip">
              {item.name}
              {item.quantityGm > 0 ? ` · ${item.quantityGm}g` : ""}
            </span>
          ))}
        </div>
      ) : null}

      {log.photoUrl ? (
        <a
          href={log.photoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-log-card__photo-link"
        >
          View photo
        </a>
      ) : null}

      <div className="mt-review-macros mt-pending-card__review">
        <span className="mt-items-section__label">Review macros</span>

        <div className="mt-macros-inputs mt-macros-inputs--compact">
          {MACRO_FIELDS.map(({ key, label, color }) => (
            <label key={key} className="mt-macro-input">
              <span className="mt-macro-input__label" style={{ color }}>
                {label}
              </span>
              <input
                className="user-field__input"
                type="number"
                min={0}
                step={0.1}
                value={macroValues[key].val}
                onChange={(e) => macroValues[key].set(e.target.value)}
              />
            </label>
          ))}
        </div>

        <label className="mt-form-field mt-form-field--full">
          <span className="mt-form-field__label">Rejection reason (optional)</span>
          <input
            className="user-field__input"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Only used when rejecting"
          />
        </label>

        <div className="mt-pending-card__actions">
          <button
            type="button"
            className="btn btn--ghost text-danger"
            disabled={reviewing}
            onClick={() => onReview(log, buildPayload("rejected"))}
          >
            Reject
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={reviewing}
            onClick={() => onReview(log, buildPayload("approved"))}
          >
            {reviewing ? "Saving…" : "Approve"}
          </button>
        </div>
      </div>
    </article>
  );
}

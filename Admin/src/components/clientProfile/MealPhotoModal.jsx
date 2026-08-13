import { createPortal } from "react-dom";
function getModalRoot() {
  return document.querySelector(".updated-admin .ua-cp-drawer")
    || document.querySelector(".updated-admin");
}

export function MealPhotoModal({ meal, dateLabel, onClose }) {
  const modal = (
    <div className="ua-cp-modal-backdrop ua-cp-modal-backdrop--drawer" onClick={onClose} role="presentation">
      <div
        className="ua-cp-modal ua-cp-modal--meal-photo"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="meal-photo-title"
      >
        <div className="ua-cp-meal-photo-modal__head">
          <div>
            <h3 id="meal-photo-title" className="ua-cp-meal-photo-modal__title">{meal.name}</h3>
            <p className="ua-cp-meal-photo-modal__sub">{dateLabel} · {meal.time}</p>
          </div>
          <button type="button" className="ua-cp-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="ua-cp-meal-photo-modal__photo">
          <span className="ua-cp-meal-photo-modal__camera" aria-hidden="true">📷</span>
          <span>Full meal photo</span>
        </div>
      </div>
    </div>
  );

  const root = getModalRoot();
  return root ? createPortal(modal, root) : modal;
}

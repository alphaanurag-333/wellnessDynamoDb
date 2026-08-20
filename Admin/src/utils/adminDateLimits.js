/** Local calendar YYYY-MM-DD for native date inputs. */
export function todayIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateLikeInput(el) {
  return (
    el instanceof HTMLInputElement
    && (el.type === "date" || el.type === "datetime-local" || el.type === "month")
  );
}

function allowsFuture(el) {
  return el?.dataset?.allowFuture === "true";
}

function maxValueForInput(el, today) {
  if (el.type === "datetime-local") return `${today}T23:59`;
  if (el.type === "month") return today.slice(0, 7);
  return today;
}

function clampDateInputValue(el, today) {
  if (!el.value) return false;
  const max = maxValueForInput(el, today);
  if (el.value <= max) return false;
  el.value = max;
  return true;
}

function applyMaxAttribute(el, today) {
  if (allowsFuture(el)) {
    if (el.hasAttribute("max") && el.dataset.adminDateMaxApplied === "true") {
      el.removeAttribute("max");
      delete el.dataset.adminDateMaxApplied;
    }
    return;
  }
  const max = maxValueForInput(el, today);
  if (el.getAttribute("max") !== max) {
    el.setAttribute("max", max);
    el.dataset.adminDateMaxApplied = "true";
  }
}

/**
 * Prevent future dates on admin date filters / pickers.
 * Opt out with data-allow-future="true" (e.g. scheduled start dates).
 */
export function installAdminDateLimits(root = document) {
  function syncAll() {
    const today = todayIsoDate();
    root.querySelectorAll?.("input[type='date'], input[type='datetime-local'], input[type='month']")
      ?.forEach((el) => applyMaxAttribute(el, today));
  }

  function onFocusIn(event) {
    const el = event.target;
    if (!isDateLikeInput(el)) return;
    applyMaxAttribute(el, todayIsoDate());
  }

  function onValueEvent(event) {
    const el = event.target;
    if (!isDateLikeInput(el) || allowsFuture(el)) return;
    const today = todayIsoDate();
    applyMaxAttribute(el, today);
    clampDateInputValue(el, today);
  }

  syncAll();

  let frame = 0;
  const observer = typeof MutationObserver !== "undefined"
    ? new MutationObserver(() => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        syncAll();
      });
    })
    : null;
  observer?.observe(root === document ? document.body : root, {
    childList: true,
    subtree: true,
  });

  root.addEventListener("focusin", onFocusIn, true);
  root.addEventListener("input", onValueEvent, true);
  root.addEventListener("change", onValueEvent, true);

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    observer?.disconnect();
    root.removeEventListener("focusin", onFocusIn, true);
    root.removeEventListener("input", onValueEvent, true);
    root.removeEventListener("change", onValueEvent, true);
  };
}

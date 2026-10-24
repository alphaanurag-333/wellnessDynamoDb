/** Browser event when admin inbox receives a new counselling activity. */
export const COUNSELLING_ACTIVITY_EVENT = "wellness:counselling-activity";

export function dispatchCounsellingActivity(detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COUNSELLING_ACTIVITY_EVENT, {
      detail,
    }),
  );
}

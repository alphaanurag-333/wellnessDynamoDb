const ORDER_MIN = 0;
const ORDER_MAX = 100000;

function normalizeOrder(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < ORDER_MIN) return fallback;
  return Math.min(Math.floor(n), ORDER_MAX);
}

/** Lower `order` first; missing order last; then newest createdAt. */
function sortByOrderAsc(a, b) {
  const orderA = normalizeOrder(a?.order, 9999);
  const orderB = normalizeOrder(b?.order, 9999);
  if (orderA !== orderB) return orderA - orderB;
  const aTime = new Date(a?.createdAt || 0).getTime();
  const bTime = new Date(b?.createdAt || 0).getTime();
  return bTime - aTime;
}

module.exports = {
  ORDER_MIN,
  ORDER_MAX,
  normalizeOrder,
  sortByOrderAsc,
};

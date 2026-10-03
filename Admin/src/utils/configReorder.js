function compareByOrder(a, b) {
  const orderA = Number.isFinite(Number(a?.order)) ? Number(a.order) : 9999;
  const orderB = Number.isFinite(Number(b?.order)) ? Number(b.order) : 9999;
  if (orderA !== orderB) return orderA - orderB;
  const aTime = new Date(a?.createdAt || 0).getTime();
  const bTime = new Date(b?.createdAt || 0).getTime();
  return bTime - aTime;
}

function reconcileMovedOrder(items, orderById) {
  if (!Array.isArray(items) || !orderById?.size) return items;
  const ranked = items.map((row) => (
    orderById.has(row.id) ? { ...row, order: orderById.get(row.id) } : row
  ));
  ranked.sort(compareByOrder);
  return ranked;
}

export async function moveConfigListItem({
  canReorder,
  busy,
  setBusy,
  items,
  setItems,
  index,
  direction,
  currentId,
  listAll,
  updateItem,
  reload,
  onToast,
  blockedMessage = "Clear search and filters to reorder",
  crossPage = false,
  page,
  pageSize,
}) {
  if (!canReorder) {
    onToast?.(blockedMessage);
    return;
  }
  if (busy) return;

  const next = index + direction;
  const atVisibleEdge = next < 0 || next >= items.length;
  if (atVisibleEdge && !crossPage) return;

  const itemId = currentId || items[index]?.id;
  if (!itemId) return;

  let optimistic = items;
  if (!atVisibleEdge) {
    optimistic = [...items];
    const [moved] = optimistic.splice(index, 1);
    optimistic.splice(next, 0, moved);
    setItems(optimistic);
  }

  setBusy(true);
  try {
    const allItems = (await listAll()) || [];
    // listAll must match on-screen order; normalize before applying direction.
    const sortedAll = [...allItems].sort(compareByOrder);

    // When the visible list is the full set, trust the optimistic UI order.
    // A page-edge move has no on-screen neighbor, so use the full list instead.
    const visibleIds = optimistic.map((row) => row.id).filter(Boolean);
    const allIds = new Set(sortedAll.map((row) => row.id));
    const visibleIsComplete =
      !atVisibleEdge
      && visibleIds.length === sortedAll.length
      && visibleIds.length > 0
      && visibleIds.every((id) => allIds.has(id));

    let reordered;
    if (visibleIsComplete) {
      const byId = new Map(sortedAll.map((row) => [row.id, row]));
      reordered = visibleIds.map((id) => byId.get(id)).filter(Boolean);
    } else {
      const globalIndex = sortedAll.findIndex((row) => row.id === itemId);
      if (globalIndex < 0) throw new Error("Item not found");

      const globalNext = globalIndex + direction;
      if (globalNext < 0 || globalNext >= sortedAll.length) {
        await reload();
        return;
      }

      reordered = [...sortedAll];
      const [row] = reordered.splice(globalIndex, 1);
      reordered.splice(globalNext, 0, row);
    }

    const orderById = new Map();
    const writes = [];
    reordered.forEach((item, idx) => {
      const order = (idx + 1) * 10;
      orderById.set(item.id, order);
      if (Number(item.order) !== order) writes.push(updateItem(item.id, { order }));
    });
    if (writes.length) await Promise.all(writes);
    const safePage = Number(page);
    const safeSize = Number(pageSize);
    if (Number.isInteger(safePage) && safePage > 0 && Number.isInteger(safeSize) && safeSize > 0) {
      const start = (safePage - 1) * safeSize;
      setItems(reordered.slice(start, start + safeSize).map((item) => ({
        ...item,
        order: orderById.get(item.id),
      })));
    } else {
      await reload();
      // The list index can still return the previous order for a moment.
      setItems((prev) => reconcileMovedOrder(prev, orderById));
    }
  } catch (error) {
    await reload();
    onToast?.(error?.message || "Could not reorder");
  } finally {
    setBusy(false);
  }
}

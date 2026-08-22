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
}) {
  if (!canReorder) {
    onToast?.(blockedMessage);
    return;
  }
  const next = index + direction;
  if (next < 0 || next >= items.length || busy) return;

  const itemId = currentId || items[index]?.id;
  if (!itemId) return;

  const optimistic = [...items];
  const [moved] = optimistic.splice(index, 1);
  optimistic.splice(next, 0, moved);
  setItems(optimistic);

  setBusy(true);
  try {
    const allItems = (await listAll()) || [];
    // listAll must match on-screen order; normalize before applying direction.
    const sortedAll = [...allItems].sort((a, b) => {
      const orderA = Number.isFinite(Number(a?.order)) ? Number(a.order) : 9999;
      const orderB = Number.isFinite(Number(b?.order)) ? Number(b.order) : 9999;
      if (orderA !== orderB) return orderA - orderB;
      const aTime = new Date(a?.createdAt || 0).getTime();
      const bTime = new Date(b?.createdAt || 0).getTime();
      return bTime - aTime;
    });

    // When the visible list is the full set, trust the optimistic UI order.
    const visibleIds = optimistic.map((row) => row.id).filter(Boolean);
    const allIds = new Set(sortedAll.map((row) => row.id));
    const visibleIsComplete =
      visibleIds.length === sortedAll.length
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

    await Promise.all(
      reordered.map((item, idx) => updateItem(item.id, { order: (idx + 1) * 10 })),
    );
    await reload();
  } catch (error) {
    await reload();
    onToast?.(error?.message || "Could not reorder");
  } finally {
    setBusy(false);
  }
}

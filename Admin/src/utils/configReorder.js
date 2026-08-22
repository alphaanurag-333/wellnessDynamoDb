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
    const globalIndex = allItems.findIndex((row) => row.id === itemId);
    if (globalIndex < 0) throw new Error("Item not found");

    const globalNext = globalIndex + direction;
    if (globalNext < 0 || globalNext >= allItems.length) {
      await reload();
      return;
    }

    const reordered = [...allItems];
    const [row] = reordered.splice(globalIndex, 1);
    reordered.splice(globalNext, 0, row);

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

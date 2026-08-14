import { useCallback, useEffect, useMemo, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import {
  adminAddConfigDropdownOption,
  adminDeleteConfigDropdownOption,
  adminListConfigDropdowns,
  adminUpdateConfigDropdownOption,
} from "../api/configDropdownApi.js";

const FILTERS = ["All options", "On", "Hidden"];

function matchesQuery(list, query) {
  if (!query) return true;
  if (asCopyString(list.title).toLowerCase().includes(query)) return true;
  return list.options.some((entry) => asCopyString(entry.label).toLowerCase().includes(query));
}

export function DropdownsSection({ lists, setLists, onToast }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All options");
  const [drafts, setDrafts] = useState({});
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const query = search.trim().toLowerCase();

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const { lists: rows } = await adminListConfigDropdowns(null, { limit: 50 });
      setLists(rows);
    } catch (error) {
      onToast(error?.message || "Failed to load dropdowns");
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, [onToast, setLists]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const visible = useMemo(() => {
    return lists
      .map((list) => {
        const options = list.options.filter((entry) => {
          if (filter === "On") return entry.on;
          if (filter === "Hidden") return !entry.on;
          return true;
        });
        return { ...list, options };
      })
      .filter((list) => list.options.length > 0 && matchesQuery(list, query));
  }, [lists, filter, query]);

  const optionCount = lists.reduce((sum, list) => sum + list.options.length, 0);
  const hiddenCount = lists.reduce((sum, list) => sum + list.options.filter((entry) => !entry.on).length, 0);
  const visibleOptionCount = visible.reduce((sum, list) => sum + list.options.length, 0);
  const visibleHiddenCount = visible.reduce((sum, list) => sum + list.options.filter((entry) => !entry.on).length, 0);

  function replaceList(nextList) {
    if (!nextList) return;
    setLists((prev) => prev.map((list) => (list.id === nextList.id ? nextList : list)));
  }

  async function addOption(listId) {
    const label = asCopyString(drafts[listId]).trim();
    if (!label || busy) return;
    setBusy(true);
    try {
      const { list } = await adminAddConfigDropdownOption(null, listId, { label, on: true });
      replaceList(list);
      setDrafts((prev) => ({ ...prev, [listId]: "" }));
      onToast("Option added");
    } catch (error) {
      onToast(error?.message || "Failed to add option");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(listId, optionId) {
    const label = asCopyString(editValue).trim();
    if (!label || busy) return;
    setBusy(true);
    try {
      const { list } = await adminUpdateConfigDropdownOption(null, listId, optionId, { label });
      replaceList(list);
      setEditing(null);
      setEditValue("");
      onToast("Option saved");
    } catch (error) {
      onToast(error?.message || "Failed to save option");
    } finally {
      setBusy(false);
    }
  }

  async function toggleOption(listId, option) {
    if (busy) return;
    const nextOn = !option.on;
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              options: list.options.map((row) => (row.id === option.id ? { ...row, on: nextOn } : row)),
            }
          : list,
      ),
    );
    setBusy(true);
    try {
      const { list } = await adminUpdateConfigDropdownOption(null, listId, option.id, { on: nextOn });
      replaceList(list);
      onToast(nextOn ? "Option shown" : "Option hidden");
    } catch (error) {
      setLists((prev) =>
        prev.map((list) =>
          list.id === listId
            ? {
                ...list,
                options: list.options.map((row) => (row.id === option.id ? { ...row, on: option.on } : row)),
              }
            : list,
        ),
      );
      onToast(error?.message || "Failed to update option");
    } finally {
      setBusy(false);
    }
  }

  async function removeOption(listId, option) {
    if (busy) return;
    const previous = lists;
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? { ...list, options: list.options.filter((row) => row.id !== option.id) }
          : list,
      ),
    );
    if (editing === `${listId}:${option.id}`) {
      setEditing(null);
      setEditValue("");
    }
    setBusy(true);
    try {
      const list = await adminDeleteConfigDropdownOption(null, listId, option.id);
      replaceList(list);
      onToast("Option removed");
    } catch (error) {
      setLists(previous);
      onToast(error?.message || "Failed to remove option");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ua-cfg-dd">
      <div className="ua-cfg-dd-toolbar">
        <input
          type="search"
          className="ua-cfg-dd-search"
          placeholder="Search any option or list..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          type="button"
          className="ua-cfg-dd-filter"
          onClick={() => setFilter((prev) => FILTERS[(FILTERS.indexOf(prev) + 1) % FILTERS.length])}
        >
          {filter}
        </button>
        <div className="ua-cfg-dd-stats">
          <span><strong>{query || filter !== "All options" ? visible.length : lists.length}</strong> lists</span>
          <span><strong>{query || filter !== "All options" ? visibleOptionCount : optionCount}</strong> options</span>
          <span><strong>{query || filter !== "All options" ? visibleHiddenCount : hiddenCount}</strong> hidden</span>
        </div>
      </div>

      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching dropdowns from the server…</p>
      ) : (
        <div className="ua-cfg-dd-grid">
          {visible.map((list) => {
            const source = lists.find((entry) => entry.id === list.id) ?? list;
            const onCount = source.options.filter((entry) => entry.on).length;
            return (
              <section key={list.id} className={`ua-cfg-dd-card${list.wide ? " ua-cfg-dd-card--wide" : ""}`}>
                <div className="ua-cfg-dd-card__head">
                  <h3>{asCopyString(list.title)}</h3>
                  <span>{onCount}/{source.options.length} on</span>
                </div>
                <div className="ua-cfg-dd-card__list">
                  {list.options.map((entry) => {
                    const isEditing = editing === `${list.id}:${entry.id}`;
                    return (
                      <div key={entry.id} className={`ua-cfg-dd-row${entry.on ? "" : " is-off"}`}>
                        <i aria-hidden="true" />
                        {isEditing ? (
                          <input
                            className="ua-cfg-dd-row__input"
                            value={asCopyString(editValue)}
                            disabled={busy}
                            onChange={(event) => setEditValue(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") saveEdit(list.id, entry.id);
                            }}
                          />
                        ) : (
                          <strong>{asCopyString(entry.label)}</strong>
                        )}
                        {isEditing ? (
                          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={busy} onClick={() => saveEdit(list.id, entry.id)}>
                            Save
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                            disabled={busy}
                            onClick={() => {
                              setEditing(`${list.id}:${entry.id}`);
                              setEditValue(asCopyString(entry.label));
                            }}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          className={`ua-toggle ua-toggle--sm${entry.on ? " ua-toggle--on" : ""}`}
                          aria-pressed={entry.on}
                          disabled={busy}
                          onClick={() => toggleOption(list.id, entry)}
                        >
                          <span className="ua-toggle__knob" />
                        </button>
                        <button
                          type="button"
                          className="ua-cfg-icon-btn"
                          aria-label={`Remove ${asCopyString(entry.label)}`}
                          disabled={busy}
                          onClick={() => removeOption(list.id, entry)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="ua-cfg-dd-add">
                  <input
                    className="ua-cfg-vh-input"
                    placeholder="Add an option..."
                    value={asCopyString(drafts[list.id])}
                    disabled={busy}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [list.id]: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addOption(list.id);
                    }}
                  />
                  <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={() => addOption(list.id)}>
                    Add
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

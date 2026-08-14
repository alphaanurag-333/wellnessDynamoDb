import { useMemo, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";

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

  const query = search.trim().toLowerCase();

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

  function updateList(id, updater) {
    setLists((prev) => prev.map((list) => (list.id === id ? updater(list) : list)));
  }

  function addOption(listId) {
    const label = asCopyString(drafts[listId]).trim();
    if (!label) return;
    updateList(listId, (list) => ({
      ...list,
      options: [...list.options, { id: `${listId}-${Date.now()}`, label, on: true }],
    }));
    setDrafts((prev) => ({ ...prev, [listId]: "" }));
    onToast("Option added");
  }

  function saveEdit(listId, optionId) {
    const label = asCopyString(editValue).trim();
    if (!label) return;
    updateList(listId, (list) => ({
      ...list,
      options: list.options.map((entry) => (entry.id === optionId ? { ...entry, label } : entry)),
    }));
    setEditing(null);
    setEditValue("");
    onToast("Option saved");
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
                          onChange={(event) => setEditValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") saveEdit(list.id, entry.id);
                          }}
                        />
                      ) : (
                        <strong>{asCopyString(entry.label)}</strong>
                      )}
                      {isEditing ? (
                        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={() => saveEdit(list.id, entry.id)}>
                          Save
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
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
                        onClick={() => updateList(list.id, (current) => ({
                          ...current,
                          options: current.options.map((row) => (row.id === entry.id ? { ...row, on: !row.on } : row)),
                        }))}
                      >
                        <span className="ua-toggle__knob" />
                      </button>
                      <button
                        type="button"
                        className="ua-cfg-icon-btn"
                        aria-label={`Remove ${asCopyString(entry.label)}`}
                        onClick={() => {
                          updateList(list.id, (current) => ({
                            ...current,
                            options: current.options.filter((row) => row.id !== entry.id),
                          }));
                          onToast("Option removed");
                        }}
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
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [list.id]: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addOption(list.id);
                  }}
                />
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={() => addOption(list.id)}>
                  Add
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

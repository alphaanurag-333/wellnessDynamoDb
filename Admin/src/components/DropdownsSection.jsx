import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import {
  adminAddConfigDropdownOption,
  adminDeleteConfigDropdownOption,
  adminListConfigDropdowns,
  adminUpdateConfigDropdownOption,
} from "../api/configDropdownApi.js";
import {
  adminCreateHealthConcern,
  adminDeleteHealthConcern,
  adminListHealthConcerns,
  adminUpdateHealthConcern,
  mapConcernsToDropdownList,
} from "../api/healthConcernApi.js";
import {
  adminCreateMedicalConditionQuestion,
  adminDeleteMedicalConditionQuestion,
  adminListMedicalConditionQuestions,
  adminUpdateMedicalConditionQuestion,
  mapQuestionsToDropdownList,
} from "../api/medicalConditionQuestionApi.js";
import { MEDICAL_ANSWER_TYPES } from "../data/configDetailData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { CfgSelect } from "./shared.jsx";

const FILTER_OPTIONS = [
  { value: "All options", label: "All options" },
  { value: "On", label: "On" },
  { value: "Hidden", label: "Hidden" },
];

const ANSWER_TYPE_OPTIONS = MEDICAL_ANSWER_TYPES.map((entry) => ({
  value: entry.id,
  label: entry.label,
}));

const ICON_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/jpg";

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div>
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function matchesQuery(list, query) {
  if (!query) return true;
  if (asCopyString(list.title).toLowerCase().includes(query)) return true;
  return list.options.some((entry) => asCopyString(entry.label).toLowerCase().includes(query));
}

function isImageIcon(icon) {
  const value = String(icon || "").trim();
  if (!value) return false;
  return /^https?:\/\//i.test(value) || value.startsWith("blob:") || value.includes("/");
}

function IconPicker({ previewUrl, disabled, onPick, onClear, label = "Upload icon" }) {
  const inputRef = useRef(null);
  const filled = Boolean(previewUrl);

  return (
    <div className={`ua-cfg-dd-icon-pick${filled ? " has-image" : ""}`}>
      <button
        type="button"
        className="ua-cfg-dd-icon-pick__btn"
        disabled={disabled}
        aria-label={label}
        onClick={() => inputRef.current?.click()}
      >
        {filled ? <img src={previewUrl} alt="" /> : <span>+</span>}
      </button>
      {filled && onClear ? (
        <button
          type="button"
          className="ua-cfg-rc-media-x"
          aria-label="Remove icon"
          disabled={disabled}
          onClick={onClear}
        >
          ×
        </button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={ICON_ACCEPT}
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          onPick(file);
        }}
      />
    </div>
  );
}

function answerTypeLabel(value) {
  return MEDICAL_ANSWER_TYPES.find((entry) => entry.id === value)?.label || "Text";
}

function OptionIcon({ icon }) {
  const value = asCopyString(icon);
  if (!value) return <span className="ua-cfg-dd-row__thumb ua-cfg-dd-row__thumb--empty" aria-hidden="true" />;
  if (isImageIcon(value)) {
    return (
      <span className="ua-cfg-dd-row__thumb">
        <img src={value} alt="" />
      </span>
    );
  }
  return <span className="ua-cfg-dd-row__emoji">{value}</span>;
}

export function DropdownsSection({ lists, setLists, onToast }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All options");
  const [drafts, setDrafts] = useState({});
  const [iconFiles, setIconFiles] = useState({});
  const [iconPreviews, setIconPreviews] = useState({});
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editAnswerType, setEditAnswerType] = useState("yes_no_text");
  const [answerTypeDrafts, setAnswerTypeDrafts] = useState({});
  const [editIconFile, setEditIconFile] = useState(null);
  const [editIconPreview, setEditIconPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const query = search.trim().toLowerCase();

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const [{ lists: rows }, concernsResult, questionsResult] = await Promise.all([
        adminListConfigDropdowns(null, { limit: 50 }),
        adminListHealthConcerns(null, { limit: 200 }).catch(() => ({ healthConcerns: [] })),
        adminListMedicalConditionQuestions(null, { limit: 200 }).catch(() => ({ questions: [] })),
      ]);
      const filtered = (rows || []).filter(
        (list) => !["program-category", "health-concern", "medical-questions"].includes(list.slug),
      );
      const concerns = concernsResult?.healthConcerns || [];
      const questions = questionsResult?.questions || [];
      setLists([
        mapConcernsToDropdownList(concerns),
        mapQuestionsToDropdownList(questions),
        ...filtered,
      ]);
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

  useEffect(() => () => {
    Object.values(iconPreviews).forEach((url) => {
      if (String(url).startsWith("blob:")) URL.revokeObjectURL(url);
    });
  }, [iconPreviews]);

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
      .filter((list) => (list.slug === "health-concern" || list.slug === "medical-questions" || list.options.length > 0) && matchesQuery(list, query));
  }, [lists, filter, query]);

  const optionCount = lists.reduce((sum, list) => sum + list.options.length, 0);
  const hiddenCount = lists.reduce((sum, list) => sum + list.options.filter((entry) => !entry.on).length, 0);

  function replaceList(nextList) {
    if (!nextList) return;
    setLists((prev) => prev.map((list) => (list.id === nextList.id ? nextList : list)));
  }

  function pickAddIcon(listId, file) {
    setIconPreviews((prev) => {
      const previous = prev[listId];
      if (String(previous).startsWith("blob:")) URL.revokeObjectURL(previous);
      return { ...prev, [listId]: file ? URL.createObjectURL(file) : "" };
    });
    setIconFiles((prev) => ({ ...prev, [listId]: file || null }));
  }

  function clearAddIcon(listId) {
    pickAddIcon(listId, null);
  }

  function startEdit(list, entry) {
    setEditing(`${list.id}:${entry.id}`);
    setEditValue(asCopyString(entry.label));
    setEditAnswerType(entry.answerType || "yes_no_text");
    setEditIconFile(null);
    setEditIconPreview(asCopyString(entry.icon));
  }

  function cancelEdit() {
    if (String(editIconPreview).startsWith("blob:")) URL.revokeObjectURL(editIconPreview);
    setEditing(null);
    setEditValue("");
    setEditAnswerType("yes_no_text");
    setEditIconFile(null);
    setEditIconPreview("");
  }

  async function addOption(list) {
    const label = asCopyString(drafts[list.id]).trim();
    if (!label || busy) return;
    if (list.slug === "health-concern" && !(iconFiles[list.id] instanceof File)) {
      onToast("Upload an icon image first");
      return;
    }
    setBusy(true);
    try {
      if (list.slug === "health-concern") {
        const created = await adminCreateHealthConcern(
          null,
          { title: label, description: label },
          iconFiles[list.id],
        );
        setLists((prev) =>
          prev.map((row) =>
            row.slug === "health-concern"
              ? {
                  ...row,
                  options: [
                    ...row.options,
                    {
                      id: created.id,
                      label: created.title,
                      value: created.id,
                      icon: created.icon,
                      description: created.description,
                      on: created.status !== "inactive",
                      sortOrder: row.options.length + 1,
                    },
                  ],
                }
              : row,
          ),
        );
        clearAddIcon(list.id);
      } else if (list.slug === "medical-questions") {
        const created = await adminCreateMedicalConditionQuestion(null, {
          question: label,
          answerType: answerTypeDrafts[list.id] || "yes_no_text",
          shown: true,
        });
        setLists((prev) =>
          prev.map((row) =>
            row.slug === "medical-questions"
              ? {
                  ...row,
                  options: [
                    ...row.options,
                    {
                      id: created.id,
                      label: created.question,
                      value: created.id,
                      answerType: created.answerType,
                      on: created.shown,
                      sortOrder: created.sortOrder,
                    },
                  ],
                }
              : row,
          ),
        );
        setAnswerTypeDrafts((prev) => ({ ...prev, [list.id]: "yes_no_text" }));
      } else {
        const { list: nextList } = await adminAddConfigDropdownOption(null, list.id, {
          label,
          on: true,
        });
        replaceList(nextList);
      }
      setDrafts((prev) => ({ ...prev, [list.id]: "" }));
      onToast("Option added");
    } catch (error) {
      onToast(error?.message || "Failed to add option");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(list, optionId) {
    const label = asCopyString(editValue).trim();
    if (!label || busy) return;
    setBusy(true);
    try {
      if (list.slug === "health-concern") {
        const updated = await adminUpdateHealthConcern(
          null,
          optionId,
          { title: label },
          editIconFile instanceof File ? editIconFile : undefined,
        );
        setLists((prev) =>
          prev.map((row) =>
            row.slug === "health-concern"
              ? {
                  ...row,
                  options: row.options.map((option) =>
                    option.id === optionId
                      ? {
                          ...option,
                          label: updated.title,
                          icon: updated.icon,
                          description: updated.description,
                          on: updated.status !== "inactive",
                        }
                      : option,
                  ),
                }
              : row,
          ),
        );
      } else if (list.slug === "medical-questions") {
        const updated = await adminUpdateMedicalConditionQuestion(null, optionId, {
          question: label,
          answerType: editAnswerType,
        });
        setLists((prev) =>
          prev.map((row) =>
            row.slug === "medical-questions"
              ? {
                  ...row,
                  options: row.options.map((option) =>
                    option.id === optionId
                      ? {
                          ...option,
                          label: updated.question,
                          answerType: updated.answerType,
                          on: updated.shown,
                        }
                      : option,
                  ),
                }
              : row,
          ),
        );
      } else {
        const { list: nextList } = await adminUpdateConfigDropdownOption(null, list.id, optionId, { label });
        replaceList(nextList);
      }
      cancelEdit();
      onToast("Option saved");
    } catch (error) {
      onToast(error?.message || "Failed to save option");
    } finally {
      setBusy(false);
    }
  }

  async function toggleOption(list, option) {
    if (busy) return;
    const nextOn = !option.on;
    setLists((prev) =>
      prev.map((row) =>
        row.id === list.id
          ? {
              ...row,
              options: row.options.map((entry) => (entry.id === option.id ? { ...entry, on: nextOn } : entry)),
            }
          : row,
      ),
    );
    setBusy(true);
    try {
      if (list.slug === "health-concern") {
        const updated = await adminUpdateHealthConcern(null, option.id, { on: nextOn });
        setLists((prev) =>
          prev.map((row) =>
            row.slug === "health-concern"
              ? {
                  ...row,
                  options: row.options.map((entry) =>
                    entry.id === option.id
                      ? { ...entry, on: updated.status !== "inactive", icon: updated.icon, label: updated.title }
                      : entry,
                  ),
                }
              : row,
          ),
        );
      } else if (list.slug === "medical-questions") {
        const updated = await adminUpdateMedicalConditionQuestion(null, option.id, { shown: nextOn });
        setLists((prev) =>
          prev.map((row) =>
            row.slug === "medical-questions"
              ? {
                  ...row,
                  options: row.options.map((entry) =>
                    entry.id === option.id
                      ? { ...entry, on: updated.shown, label: updated.question, answerType: updated.answerType }
                      : entry,
                  ),
                }
              : row,
          ),
        );
      } else {
        const { list: nextList } = await adminUpdateConfigDropdownOption(null, list.id, option.id, { on: nextOn });
        replaceList(nextList);
      }
      onToast(nextOn ? "Option shown" : "Option hidden");
    } catch (error) {
      setLists((prev) =>
        prev.map((row) =>
          row.id === list.id
            ? {
                ...row,
                options: row.options.map((entry) => (entry.id === option.id ? { ...entry, on: option.on } : entry)),
              }
            : row,
        ),
      );
      onToast(error?.message || "Failed to update option");
    } finally {
      setBusy(false);
    }
  }

  function askRemoveOption(list, option) {
    if (busy) return;
    setPendingDelete({
      listId: list.id,
      listSlug: list.slug,
      optionId: option.id,
      label: asCopyString(option.label),
      listTitle: asCopyString(list.title),
      icon: asCopyString(option.icon),
    });
  }

  async function confirmRemoveOption() {
    if (!pendingDelete || busy) return;
    const { listId, listSlug, optionId, label } = pendingDelete;
    const previous = lists;
    setPendingDelete(null);
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? { ...list, options: list.options.filter((row) => row.id !== optionId) }
          : list,
      ),
    );
    if (editing === `${listId}:${optionId}`) cancelEdit();
    setBusy(true);
    try {
      if (listSlug === "health-concern") {
        await adminDeleteHealthConcern(null, optionId);
      } else if (listSlug === "medical-questions") {
        await adminDeleteMedicalConditionQuestion(null, optionId);
      } else {
        const nextList = await adminDeleteConfigDropdownOption(null, listId, optionId);
        replaceList(nextList);
      }
      onToast(`Removed “${label}”`);
    } catch (error) {
      setLists(previous);
      onToast(error?.message || "Failed to remove option");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ua-cfg-dd">
      <Panel
        title="Dropdown lists"
        subtitle={
          loading
            ? "Loading lists from the server…"
            : `${lists.length} lists · ${optionCount} options · ${hiddenCount} hidden`
        }
      >
        <div className="ua-cfg-dd-toolbar">
          <input
            type="search"
            className="ua-cfg-dd-search"
            placeholder="Search any option or list…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search dropdowns"
          />
          <CfgSelect
            className="ua-cfg-dd-filter"
            options={FILTER_OPTIONS}
            value={filter}
            disabled={busy || loading}
            onChange={setFilter}
            ariaLabel="Filter options"
          />
        </div>
      </Panel>

      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching dropdowns from the server…</p>
      ) : visible.length ? (
        <div className="ua-cfg-dd-grid">
          {visible.map((list) => {
            const source = lists.find((entry) => entry.id === list.id) ?? list;
            const onCount = source.options.filter((entry) => entry.on).length;
            const supportsIcons = list.slug === "health-concern";
            const supportsAnswerType = list.slug === "medical-questions";
            return (
              <section
                key={list.id}
                className={`ua-cfg-panel ua-cfg-dd-card${list.wide || supportsIcons || supportsAnswerType ? " ua-cfg-dd-card--wide" : ""}`}
              >
                <div className="ua-cfg-panel__head ua-cfg-dd-card__head">
                  <div>
                    <h3 className="ua-cfg-panel__title">{asCopyString(list.title)}</h3>
                    <p className="ua-cfg-panel__sub">
                      {supportsIcons
                        ? "Shown in client forms, reviews, and program filters"
                        : supportsAnswerType
                          ? "Medical questionnaire answers in onboarding"
                          : "Used across admin forms and site filters"}
                    </p>
                  </div>
                  <span className={`ua-cfg-dd-count${onCount ? " is-on" : ""}`}>
                    {onCount}/{source.options.length} on
                  </span>
                </div>

                <div className="ua-cfg-dd-card__list">
                  {list.options.length ? list.options.map((entry) => {
                    const isEditing = editing === `${list.id}:${entry.id}`;
                    return (
                      <div
                        key={entry.id}
                        className={`ua-cfg-dd-row${supportsIcons ? " has-icon" : ""}${supportsAnswerType ? " has-type" : ""}${entry.on ? "" : " is-off"}${isEditing ? " is-editing" : ""}`}
                      >
                        {isEditing ? (
                          <div className={`ua-cfg-dd-row__fields${supportsIcons ? " has-icon" : ""}${supportsAnswerType ? " has-type" : ""}`}>
                            {supportsIcons ? (
                              <IconPicker
                                previewUrl={editIconPreview}
                                disabled={busy}
                                label="Change icon"
                                onPick={(file) => {
                                  if (!file) return;
                                  if (String(editIconPreview).startsWith("blob:")) URL.revokeObjectURL(editIconPreview);
                                  setEditIconFile(file);
                                  setEditIconPreview(URL.createObjectURL(file));
                                }}
                              />
                            ) : null}
                            <input
                              className="ua-cfg-dd-row__input"
                              value={asCopyString(editValue)}
                              disabled={busy}
                              onChange={(event) => setEditValue(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") saveEdit(list, entry.id);
                                if (event.key === "Escape") cancelEdit();
                              }}
                            />
                            {supportsAnswerType ? (
                              <CfgSelect
                                className="ua-cfg-dd-select"
                                options={ANSWER_TYPE_OPTIONS}
                                value={editAnswerType}
                                disabled={busy}
                                onChange={setEditAnswerType}
                                ariaLabel="Answer type"
                              />
                            ) : null}
                          </div>
                        ) : (
                          <div className="ua-cfg-dd-row__main">
                            {supportsIcons ? <OptionIcon icon={entry.icon} /> : null}
                            <strong className="ua-cfg-dd-row__label">{asCopyString(entry.label)}</strong>
                            {supportsAnswerType ? (
                              <span className="ua-cfg-dd-row__type-badge">{answerTypeLabel(entry.answerType)}</span>
                            ) : null}
                          </div>
                        )}
                        <div className="ua-cfg-dd-row__actions">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                                disabled={busy}
                                onClick={cancelEdit}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                                disabled={busy}
                                onClick={() => saveEdit(list, entry.id)}
                              >
                                Save
                              </button>
                            </>
                          ) : (
                            <>
                              <span className={`ua-cfg-faq__shown${entry.on ? " is-on" : ""}`}>
                                {entry.on ? "LIVE" : "HIDDEN"}
                              </span>
                              <button
                                type="button"
                                className={`ua-toggle ua-toggle--sm${entry.on ? " ua-toggle--on" : ""}`}
                                aria-pressed={entry.on}
                                disabled={busy}
                                onClick={() => toggleOption(list, entry)}
                              >
                                <span className="ua-toggle__knob" />
                              </button>
                              <button
                                type="button"
                                className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                                disabled={busy}
                                onClick={() => startEdit(list, entry)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="ua-cfg-icon-btn"
                                aria-label={`Remove ${asCopyString(entry.label)}`}
                                disabled={busy}
                                onClick={() => askRemoveOption(list, entry)}
                              >
                                ×
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="ua-cfg-panel__sub ua-cfg-dd-empty">
                      {query || filter !== "All options" ? "No options match this filter." : "No options yet. Add one below."}
                    </p>
                  )}
                </div>

                <div className={`ua-cfg-dd-add${supportsIcons ? " has-icon" : ""}${supportsAnswerType ? " has-type" : ""}`}>
                  {supportsIcons ? (
                    <IconPicker
                      previewUrl={asCopyString(iconPreviews[list.id])}
                      disabled={busy}
                      label="New health concern icon"
                      onPick={(file) => pickAddIcon(list.id, file)}
                      onClear={() => clearAddIcon(list.id)}
                    />
                  ) : null}
                  <input
                    className="ua-cfg-vh-input ua-cfg-dd-add__input"
                    placeholder={
                      supportsIcons
                        ? "Add a health concern…"
                        : supportsAnswerType
                          ? "Add a medical question…"
                          : "Add an option…"
                    }
                    value={asCopyString(drafts[list.id])}
                    disabled={busy}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [list.id]: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addOption(list);
                    }}
                  />
                  {supportsAnswerType ? (
                    <CfgSelect
                      className="ua-cfg-dd-select"
                      options={ANSWER_TYPE_OPTIONS}
                      value={answerTypeDrafts[list.id] || "yes_no_text"}
                      disabled={busy}
                      onChange={(value) => setAnswerTypeDrafts((prev) => ({ ...prev, [list.id]: value }))}
                      ariaLabel="Answer type"
                    />
                  ) : null}
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-tf-add-btn"
                    disabled={busy}
                    onClick={() => addOption(list)}
                  >
                    + Add
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="ua-cfg-panel__sub">No lists match your search.</p>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        tag="Delete option"
        title={pendingDelete ? `Remove “${pendingDelete.label}”?` : ""}
        body={
          pendingDelete
            ? `This will permanently remove the option from “${pendingDelete.listTitle}”. You can’t undo this.`
            : ""
        }
        cancelLabel="Keep option"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmRemoveOption}
      />
    </div>
  );
}

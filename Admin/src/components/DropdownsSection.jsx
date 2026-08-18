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
import {
  formatPack,
  parseBottlePrice,
  parsePackSize,
  SUPPLEMENT_POOL_UNITS,
  unitOptionsFor,
} from "../data/nutritionBankData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";

const FILTERS = ["All options", "On", "Hidden"];
const ICON_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/jpg";
const EMPTY_SUPP_DRAFT = { packSize: "", unit: "Caps", price: "" };

function formatSupplementMeta(entry) {
  const pack = formatPack(entry?.packSize, entry?.unit);
  const price = Number(entry?.price);
  const parts = [];
  if (pack) parts.push(pack);
  if (Number.isFinite(price) && price > 0) parts.push(`Rs. ${price.toLocaleString("en-IN")}`);
  return parts.join(" · ");
}

function SupplementMetaFields({ packSize, unit, price, disabled, onPackSize, onUnit, onPrice }) {
  return (
    <>
      <input
        className="ua-cfg-dd-row__input"
        inputMode="numeric"
        placeholder="Pack size"
        aria-label="Pack size"
        value={packSize}
        disabled={disabled}
        onChange={(event) => onPackSize(event.target.value.replace(/[^\d]/g, ""))}
      />
      <select
        className="ua-cfg-dd-row__type"
        value={unit}
        disabled={disabled}
        aria-label="Unit"
        onChange={(event) => onUnit(event.target.value)}
      >
        {unitOptionsFor(unit, SUPPLEMENT_POOL_UNITS).map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <input
        className="ua-cfg-dd-row__input"
        inputMode="numeric"
        placeholder="Price (Rs.)"
        aria-label="Price (Rs.)"
        value={price}
        disabled={disabled}
        onChange={(event) => onPrice(event.target.value.replace(/[^\d]/g, ""))}
      />
    </>
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

function IconPicker({ previewUrl, disabled, onPick, label = "Upload icon" }) {
  const inputRef = useRef(null);

  return (
    <button
      type="button"
      className={`ua-cfg-dd-icon-pick${previewUrl ? " has-image" : ""}`}
      disabled={disabled}
      aria-label={label}
      onClick={() => inputRef.current?.click()}
    >
      {previewUrl ? <img src={previewUrl} alt="" /> : <span>+</span>}
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
    </button>
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
  const [suppDrafts, setSuppDrafts] = useState({});
  const [editIconFile, setEditIconFile] = useState(null);
  const [editIconPreview, setEditIconPreview] = useState("");
  const [editPackSize, setEditPackSize] = useState("");
  const [editUnit, setEditUnit] = useState("Caps");
  const [editPrice, setEditPrice] = useState("");
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
      .filter((list) => (
        list.slug === "health-concern"
        || list.slug === "medical-questions"
        || list.slug === "supplement-pool"
        || list.options.length > 0
      ) && matchesQuery(list, query));
  }, [lists, filter, query]);

  const optionCount = lists.reduce((sum, list) => sum + list.options.length, 0);
  const hiddenCount = lists.reduce((sum, list) => sum + list.options.filter((entry) => !entry.on).length, 0);
  const visibleOptionCount = visible.reduce((sum, list) => sum + list.options.length, 0);
  const visibleHiddenCount = visible.reduce((sum, list) => sum + list.options.filter((entry) => !entry.on).length, 0);

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
    setEditPackSize(entry.packSize ? String(entry.packSize) : "");
    setEditUnit(entry.unit || "Caps");
    setEditPrice(entry.price ? String(entry.price) : "");
  }

  function cancelEdit() {
    if (String(editIconPreview).startsWith("blob:")) URL.revokeObjectURL(editIconPreview);
    setEditing(null);
    setEditValue("");
    setEditAnswerType("yes_no_text");
    setEditIconFile(null);
    setEditIconPreview("");
    setEditPackSize("");
    setEditUnit("Caps");
    setEditPrice("");
  }

  async function addOption(list) {
    const label = asCopyString(drafts[list.id]).trim();
    if (!label || busy) return;
    if (list.slug === "health-concern" && !(iconFiles[list.id] instanceof File)) {
      onToast("Upload an icon image first");
      return;
    }
    const suppDraft = suppDrafts[list.id] || EMPTY_SUPP_DRAFT;
    const packSize = parsePackSize(suppDraft.packSize);
    const unit = String(suppDraft.unit || "").trim();
    const price = parseBottlePrice(suppDraft.price);
    if (list.slug === "supplement-pool") {
      if (!packSize) {
        onToast("Enter a pack size");
        return;
      }
      if (!unit) {
        onToast("Choose a unit");
        return;
      }
      if (!price) {
        onToast("Enter a price (Rs.)");
        return;
      }
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
          ...(list.slug === "supplement-pool" ? { packSize, unit, price } : {}),
        });
        replaceList(nextList);
      }
      setDrafts((prev) => ({ ...prev, [list.id]: "" }));
      if (list.slug === "supplement-pool") {
        setSuppDrafts((prev) => ({ ...prev, [list.id]: { ...EMPTY_SUPP_DRAFT } }));
      }
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
    const packSize = parsePackSize(editPackSize);
    const unit = String(editUnit || "").trim();
    const price = parseBottlePrice(editPrice);
    if (list.slug === "supplement-pool") {
      if (!packSize) {
        onToast("Enter a pack size");
        return;
      }
      if (!unit) {
        onToast("Choose a unit");
        return;
      }
      if (!price) {
        onToast("Enter a price (Rs.)");
        return;
      }
    }
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
        const { list: nextList } = await adminUpdateConfigDropdownOption(null, list.id, optionId, {
          label,
          ...(list.slug === "supplement-pool" ? { packSize, unit, price } : {}),
        });
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
            const supportsIcons = list.slug === "health-concern";
            const supportsAnswerType = list.slug === "medical-questions";
            const isSupplementPool = list.slug === "supplement-pool";
            return (
              <section key={list.id} className={`ua-cfg-dd-card${list.wide || supportsIcons || supportsAnswerType || isSupplementPool ? " ua-cfg-dd-card--wide" : ""}`}>
                <div className="ua-cfg-dd-card__head">
                  <h3>{asCopyString(list.title)}</h3>
                  <span>{onCount}/{source.options.length} on</span>
                </div>
                <div className="ua-cfg-dd-card__list">
                  {list.options.map((entry) => {
                    const isEditing = editing === `${list.id}:${entry.id}`;
                    return (
                      <div key={entry.id} className={`ua-cfg-dd-row${supportsIcons ? " has-icon" : ""}${supportsAnswerType ? " has-type" : ""}${isSupplementPool ? " has-supp" : ""}${entry.on ? "" : " is-off"}`}>
                        <i aria-hidden="true" />
                        {isEditing ? (
                          <div className={`ua-cfg-dd-row__fields${supportsIcons ? " has-icon" : ""}${supportsAnswerType ? " has-type" : ""}${isSupplementPool ? " has-supp" : ""}`}>
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
                              <select
                                className="ua-cfg-dd-row__type"
                                value={editAnswerType}
                                disabled={busy}
                                aria-label="Answer type"
                                onChange={(event) => setEditAnswerType(event.target.value)}
                              >
                                {MEDICAL_ANSWER_TYPES.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            {isSupplementPool ? (
                              <SupplementMetaFields
                                packSize={editPackSize}
                                unit={editUnit}
                                price={editPrice}
                                disabled={busy}
                                onPackSize={setEditPackSize}
                                onUnit={setEditUnit}
                                onPrice={setEditPrice}
                              />
                            ) : null}
                          </div>
                        ) : (
                          <strong>
                            {supportsIcons ? <OptionIcon icon={entry.icon} /> : null}
                            <span className="ua-cfg-dd-row__label">{asCopyString(entry.label)}</span>
                            {supportsAnswerType ? (
                              <span className="ua-cfg-dd-row__type-badge">{answerTypeLabel(entry.answerType)}</span>
                            ) : null}
                            {isSupplementPool && formatSupplementMeta(entry) ? (
                              <span className="ua-cfg-dd-row__meta">{formatSupplementMeta(entry)}</span>
                            ) : null}
                          </strong>
                        )}
                        {isEditing ? (
                          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={busy} onClick={() => saveEdit(list, entry.id)}>
                            Save
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                            disabled={busy}
                            onClick={() => startEdit(list, entry)}
                          >
                            Edit
                          </button>
                        )}
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
                          className="ua-cfg-icon-btn"
                          aria-label={`Remove ${asCopyString(entry.label)}`}
                          disabled={busy}
                          onClick={() => askRemoveOption(list, entry)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className={`ua-cfg-dd-add${supportsIcons ? " has-icon" : ""}${supportsAnswerType ? " has-type" : ""}${isSupplementPool ? " has-supp" : ""}`}>
                  {supportsIcons ? (
                    <IconPicker
                      previewUrl={asCopyString(iconPreviews[list.id])}
                      disabled={busy}
                      label="New health concern icon"
                      onPick={(file) => pickAddIcon(list.id, file)}
                    />
                  ) : null}
                  <input
                    className="ua-cfg-vh-input"
                    placeholder={
                      supportsIcons
                        ? "Add a health concern..."
                        : supportsAnswerType
                          ? "Add a medical question..."
                          : isSupplementPool
                            ? "Add a supplement..."
                            : "Add an option..."
                    }
                    value={asCopyString(drafts[list.id])}
                    disabled={busy}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [list.id]: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addOption(list);
                    }}
                  />
                  {supportsAnswerType ? (
                    <select
                      className="ua-cfg-dd-add__type"
                      value={answerTypeDrafts[list.id] || "yes_no_text"}
                      disabled={busy}
                      aria-label="Answer type"
                      onChange={(event) => setAnswerTypeDrafts((prev) => ({ ...prev, [list.id]: event.target.value }))}
                    >
                      {MEDICAL_ANSWER_TYPES.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {isSupplementPool ? (
                    <SupplementMetaFields
                      packSize={asCopyString((suppDrafts[list.id] || EMPTY_SUPP_DRAFT).packSize)}
                      unit={(suppDrafts[list.id] || EMPTY_SUPP_DRAFT).unit || "Caps"}
                      price={asCopyString((suppDrafts[list.id] || EMPTY_SUPP_DRAFT).price)}
                      disabled={busy}
                      onPackSize={(value) => setSuppDrafts((prev) => ({
                        ...prev,
                        [list.id]: { ...EMPTY_SUPP_DRAFT, ...prev[list.id], packSize: value },
                      }))}
                      onUnit={(value) => setSuppDrafts((prev) => ({
                        ...prev,
                        [list.id]: { ...EMPTY_SUPP_DRAFT, ...prev[list.id], unit: value },
                      }))}
                      onPrice={(value) => setSuppDrafts((prev) => ({
                        ...prev,
                        [list.id]: { ...EMPTY_SUPP_DRAFT, ...prev[list.id], price: value },
                      }))}
                    />
                  ) : null}
                  <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={busy} onClick={() => addOption(list)}>
                    Add
                  </button>
                </div>
              </section>
            );
          })}
        </div>
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

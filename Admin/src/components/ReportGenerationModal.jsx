import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  fetchScopedUsers,
  fetchUsers,
  mapUiStatusToApi,
  mapUiTierToApi,
} from "../api/usersApi.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import { TIER_OPTIONS, UNASSIGNED_COACH, tierLabel } from "../data/usersData.js";
import { CfgSelect } from "./shared.jsx";
import { ExportIcon } from "./NavIcons.jsx";

function getModalRoot() {
  return document.querySelector(".updated-admin") || document.body;
}

const STATUS_OPTIONS = [
  { value: "", label: "All status" },
  { value: "Active", label: "Active" },
  { value: "Disabled", label: "Disabled" },
];

const REPORT_FIELDS = [
  { key: "name", label: "Name", get: (u) => u.name || "" },
  { key: "email", label: "Email", get: (u) => u.email || "" },
  { key: "phone", label: "Phone", get: (u) => u.phone || "" },
  { key: "goal", label: "Health concern", get: (u) => u.goal || "" },
  { key: "tier", label: "Tier", get: (u) => tierLabel(u.tier) },
  { key: "coach", label: "Wellness coach", get: (u) => u.coach || UNASSIGNED_COACH },
  { key: "awc", label: "Assistant WC", get: (u) => u.awc || "" },
  { key: "lastActive", label: "Last active", get: (u) => u.lastActive || "" },
  { key: "status", label: "Status", get: (u) => u.status || "" },
  { key: "joined", label: "Joined", get: (u) => u.joined || "" },
];

const DEFAULT_FIELDS = ["name", "email", "phone", "tier", "status", "joined"];
const PAGE_SIZE = 200;
const SCOPED_ROLES = new Set(["wc", "awc", "trainee"]);

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dayStartMs(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function dayEndMs(value) {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function userCreatedMs(user) {
  const raw = user?.createdAt || "";
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}

function matchesDateRange(user, fromDate, toDate) {
  const fromMs = dayStartMs(fromDate);
  const toMs = dayEndMs(toDate);
  if (fromMs == null && toMs == null) return true;
  const createdMs = userCreatedMs(user);
  if (createdMs == null) return false;
  if (fromMs != null && createdMs < fromMs) return false;
  if (toMs != null && createdMs > toMs) return false;
  return true;
}

function rowsToCsv(rows, fields) {
  const headers = ["#", ...fields.map((f) => f.label)];
  const lines = [headers.map(csvCell).join(",")];
  rows.forEach((user, index) => {
    lines.push(
      [index + 1, ...fields.map((f) => f.get(user))].map(csvCell).join(","),
    );
  });
  return `\uFEFF${lines.join("\r\n")}`;
}

export function ReportGenerationModal({ open, onClose, onToast }) {
  const { can, dataScope, viewAs, viewAsPersona } = useViewAs();
  const canExportCsv = can("console.cl.export") || can("console.dash.export");
  const useScopedUsers =
    dataScope !== "all" || SCOPED_ROLES.has(viewAs) || SCOPED_ROLES.has(viewAsPersona);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedFields, setSelectedFields] = useState(() => new Set(DEFAULT_FIELDS));
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [exporting, setExporting] = useState(false);

  const activeFields = useMemo(
    () => REPORT_FIELDS.filter((field) => selectedFields.has(field.key)),
    [selectedFields],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const base = {
        status: mapUiStatusToApi(statusFilter),
        userTier: mapUiTierToApi(tierFilter),
      };
      const fetchPage = (page, limit) =>
        useScopedUsers
          ? fetchScopedUsers({ page, limit, userTier: base.userTier })
          : fetchUsers({ page, limit, ...base });

      const first = await fetchPage(1, PAGE_SIZE);
      const collected = [...(first?.users || [])];
      const pages = Math.max(1, Number(first?.pagination?.pages) || 1);
      for (let page = 2; page <= pages; page += 1) {
        const next = await fetchPage(page, PAGE_SIZE);
        collected.push(...(next?.users || []));
      }

      let rows = collected;
      if (useScopedUsers && statusFilter) {
        rows = rows.filter((u) => String(u.status || "") === statusFilter);
      }
      rows = rows.filter((u) => matchesDateRange(u, fromDate, toDate));
      setUsers(rows);
    } catch (err) {
      setUsers([]);
      setLoadError(err?.message || "Could not load users");
    } finally {
      setLoading(false);
    }
  }, [fromDate, statusFilter, tierFilter, toDate, useScopedUsers]);

  useEffect(() => {
    if (!open) return undefined;
    loadUsers();
    return undefined;
  }, [open, loadUsers]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  function toggleField(key) {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function exportCsv() {
    if (exporting || !canExportCsv) return;
    if (!activeFields.length) {
      onToast?.("Select at least one field");
      return;
    }
    if (!users.length) {
      onToast?.("No users to export");
      return;
    }
    setExporting(true);
    onToast?.("Exporting CSV…");
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`dashboard-report-${stamp}.csv`, rowsToCsv(users, activeFields));
      onToast?.(`Exported ${users.length} user${users.length === 1 ? "" : "s"}`);
    } catch (err) {
      onToast?.(err?.message || "Could not export CSV");
    } finally {
      setExporting(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="ua-cp-modal-backdrop ua-dash-report-modal"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ua-dash-report-modal__dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ua-dash-report-title"
      >
        <div className="ua-dash-report-modal__head">
          <div>
            <h3 id="ua-dash-report-title">Report Generation</h3>
            <p>Filter clients, choose fields, then export CSV.</p>
          </div>
          <button type="button" className="ua-cp-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ua-dash-report-modal__body">
          <div className="ua-dash-report-modal__filters">
            <label className="ua-dash-report-modal__field">
              <span>From date</span>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label className="ua-dash-report-modal__field">
              <span>To date</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
            <div className="ua-dash-report-modal__field">
              <span>Tier</span>
              <CfgSelect
                className="ua-users-filter"
                ariaLabel="Filter by tier"
                value={tierFilter}
                options={TIER_OPTIONS}
                onChange={setTierFilter}
              />
            </div>
            <div className="ua-dash-report-modal__field">
              <span>Status</span>
              <CfgSelect
                className="ua-users-filter"
                ariaLabel="Filter by status"
                value={statusFilter}
                options={STATUS_OPTIONS}
                onChange={setStatusFilter}
              />
            </div>
          </div>

          <div className="ua-dash-report-modal__fields">
            <div className="ua-dash-report-modal__fields-label">Fields</div>
            <div className="ua-dash-report-modal__checks">
              {REPORT_FIELDS.map((field) => (
                <label key={field.key} className="ua-dash-report-modal__check">
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field.key)}
                    onChange={() => toggleField(field.key)}
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="ua-dash-report-modal__list-wrap">
            {loading ? (
              <div className="ua-dash-report-modal__empty">
                <p>Loading users…</p>
              </div>
            ) : loadError ? (
              <div className="ua-dash-report-modal__empty">
                <p>{loadError}</p>
                <button type="button" className="btn btn--outline" onClick={loadUsers}>
                  Retry
                </button>
              </div>
            ) : users.length === 0 ? (
              <div className="ua-dash-report-modal__empty">
                <p>No users match the selected filters.</p>
              </div>
            ) : (
              <div className="ua-dash-report-modal__table-scroll">
                <table className="ua-dash-report-modal__table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {activeFields.map((field) => (
                        <th key={field.key}>{field.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={user.id || `${user.email}-${index}`}>
                        <td>{index + 1}</td>
                        {activeFields.map((field) => (
                          <td key={field.key}>{field.get(user) || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="ua-dash-report-modal__foot">
          <span className="ua-dash-report-modal__count">
            {loading ? "…" : `${users.length} user${users.length === 1 ? "" : "s"}`}
          </span>
          <div className="ua-dash-report-modal__actions">
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline" onClick={onClose}>
              Close
            </button>
            {canExportCsv ? (
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--primary"
                onClick={exportCsv}
                disabled={exporting || loading || !activeFields.length}
              >
                <ExportIcon /> {exporting ? "Exporting…" : "Export CSV"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    getModalRoot(),
  );
}

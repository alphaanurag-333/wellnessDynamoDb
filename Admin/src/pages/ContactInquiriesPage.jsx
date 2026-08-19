import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { ListPagination, PageHeader, PillTabs, StatusBadge, TableScroll } from "../components/shared.jsx";
import {
  INQUIRY_STATUS_OPTIONS,
  INQUIRY_TYPE_OPTIONS,
  deleteContactInquiry,
  inquiryFullName,
  inquiryStatusLabel,
  inquiryTypeLabel,
  listContactInquiries,
  updateContactInquiryStatus,
} from "../api/contactInquiryApi.js";
import { useViewAs } from "../context/ViewAsContext.jsx";
import "./contactInquiries.css";

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { id: "all", label: "All" },
  ...INQUIRY_STATUS_OPTIONS,
];

function statusTone(status) {
  if (status === "new") return "amber";
  if (status === "archived") return "muted";
  return "green";
}

function formatInquiryDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initialsFor(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "CU";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function InquiryDetail({ inquiry, canEdit, canDelete, busy, onClose, onStatus, onDelete }) {
  if (!inquiry) return null;
  const name = inquiryFullName(inquiry);

  return (
    <div className="ua-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="ua-ci-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ci-modal-title"
      >
        <div className="ua-ci-modal__head">
          <div>
            <div id="ci-modal-title" className="ua-ci-modal__title">{name}</div>
            <div className="ua-ci-modal__sub">{formatInquiryDate(inquiry.createdAt)}</div>
          </div>
          <button type="button" className="ua-sop-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ua-ci-modal__body">
          <dl className="ua-ci-dl">
            <div>
              <dt>Email</dt>
              <dd>
                {inquiry.email ? (
                  <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
                ) : "—"}
              </dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>
                {inquiry.phone ? (
                  <a href={`tel:${String(inquiry.phone).replace(/\s+/g, "")}`}>{inquiry.phone}</a>
                ) : "—"}
              </dd>
            </div>
            <div>
              <dt>Enquiry type</dt>
              <dd>{inquiryTypeLabel(inquiry.inquiryType)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge tone={statusTone(inquiry.status)}>
                  {inquiryStatusLabel(inquiry.status)}
                </StatusBadge>
              </dd>
            </div>
          </dl>

          <div className="ua-ci-message">
            <div className="ua-ci-message__label">Message</div>
            <p>{inquiry.message || "—"}</p>
          </div>
        </div>

        <div className="ua-ci-modal__actions">
          {canEdit ? (
            <select
              className="header__select"
              value={inquiry.status || "new"}
              disabled={busy}
              onChange={(event) => onStatus(inquiry, event.target.value)}
            >
              {INQUIRY_STATUS_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          ) : null}
          {canDelete ? (
            <button type="button" className="ua-cfg-btn ua-cfg-btn--danger" disabled={busy} onClick={() => onDelete(inquiry)}>
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ContactInquiriesPage() {
  const { showToast } = useOutletContext() || {};
  const { can } = useViewAs();
  const canView = can("console.cf.view");
  const canEdit = can("console.cf.edit");
  const canDelete = can("console.cf.delete");

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("all");
  const [inquiryType, setInquiryType] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listContactInquiries({
        page,
        limit: PAGE_SIZE,
        status: status === "all" ? undefined : status,
        inquiryType: inquiryType || undefined,
        search: debouncedSearch || undefined,
      });
      setRows(data.contactInquiries);
      setPagination(data.pagination);
    } catch (error) {
      showToast?.(error?.message || "Could not load contact inquiries");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canView, debouncedSearch, inquiryType, page, showToast, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [status, inquiryType, debouncedSearch]);

  const tabs = useMemo(
    () => STATUS_TABS.map((tab) => (
      tab.id === "all"
        ? { ...tab, count: pagination.total }
        : tab
    )),
    [pagination.total],
  );

  async function changeStatus(inquiry, nextStatus) {
    if (!canEdit || !nextStatus || nextStatus === inquiry.status) return;
    setBusy(true);
    try {
      const updated = await updateContactInquiryStatus(inquiry.id, nextStatus);
      setSelected((prev) => (prev?.id === inquiry.id ? updated : prev));
      if (status !== "all" && status !== nextStatus) {
        setRows((prev) => prev.filter((row) => row.id !== inquiry.id));
      } else {
        setRows((prev) => prev.map((row) => (row.id === inquiry.id ? updated : row)));
      }
      showToast?.(`Marked as ${inquiryStatusLabel(nextStatus)}`);
    } catch (error) {
      showToast?.(error?.message || "Could not update status");
    } finally {
      setBusy(false);
    }
  }

  async function openInquiry(inquiry) {
    setSelected(inquiry);
    if (canEdit && inquiry.status === "new") {
      changeStatus(inquiry, "read");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete?.id || !canDelete) return;
    setBusy(true);
    try {
      await deleteContactInquiry(pendingDelete.id);
      setRows((prev) => prev.filter((row) => row.id !== pendingDelete.id));
      setSelected((prev) => (prev?.id === pendingDelete.id ? null : prev));
      setPendingDelete(null);
      showToast?.("Inquiry deleted");
      load();
    } catch (error) {
      showToast?.(error?.message || "Could not delete inquiry");
    } finally {
      setBusy(false);
    }
  }

  if (!canView) {
    return (
      <main className="content ua-page-enter">
        <PageHeader title="Contact Inquiries" subtitle="You do not have permission to view website inquiries." />
      </main>
    );
  }

  return (
    <main className="content ua-page-enter ua-ci-page">
      <PageHeader
        title="Contact Inquiries"
        subtitle="Messages sent from the website contact form."
        meta={(
          <>
            <span className="page-head__count">{loading ? "…" : pagination.total}</span> inquiries
          </>
        )}
      />

      <div className="ua-ci-toolbar">
        <PillTabs
          tabs={tabs}
          active={status}
          onChange={(next) => {
            setStatus(next);
            setPage(1);
          }}
        />
        <div className="ua-ci-toolbar__filters">
          <div className="ua-search-wrap">
            <svg className="ua-search-wrap__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="ua-search-wrap__input"
              placeholder="Search name, email, phone, message"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="header__select"
            value={inquiryType}
            onChange={(event) => {
              setInquiryType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All enquiry types</option>
            {INQUIRY_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <BrandLoader variant="page" label="Loading inquiries…" />
      ) : rows.length === 0 ? (
        <div className="ua-sop-empty">No contact inquiries yet.</div>
      ) : (
        <>
          <div className="ua-table-card">
            <TableScroll>
              <div className="ua-table ua-table--inquiries ua-table__head">
                <div>Name</div>
                <div>Contact</div>
                <div>Enquiry</div>
                <div>Message</div>
                <div>Received</div>
                <div>Status</div>
                <div />
              </div>
              {rows.map((row) => {
                const name = inquiryFullName(row);
                return (
                  <div
                    key={row.id}
                    className={`ua-table ua-table--inquiries ua-table__row ua-ci-row${row.status === "new" ? " is-new" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openInquiry(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openInquiry(row);
                      }
                    }}
                  >
                    <div className="ua-ci-name" data-label="Name">
                      <span className="ua-ci-avatar" aria-hidden="true">{initialsFor(name)}</span>
                      <strong>{name}</strong>
                    </div>
                    <div data-label="Contact">
                      <div>{row.email || "—"}</div>
                      <div className="ua-table__muted">{row.phone || "—"}</div>
                    </div>
                    <div data-label="Enquiry">{inquiryTypeLabel(row.inquiryType)}</div>
                    <div className="ua-ci-clip" data-label="Message">{row.message || "—"}</div>
                    <div className="ua-table__muted" data-label="Received">{formatInquiryDate(row.createdAt)}</div>
                    <div data-label="Status">
                      <StatusBadge tone={statusTone(row.status)}>
                        {inquiryStatusLabel(row.status)}
                      </StatusBadge>
                    </div>
                    <div className="ua-ci-row-actions" data-label="Actions" onClick={(event) => event.stopPropagation()}>
                      {canEdit ? (
                        <select
                          className="header__select ua-ci-status-select"
                          value={row.status || "new"}
                          disabled={busy}
                          onChange={(event) => changeStatus(row, event.target.value)}
                          aria-label={`Status for ${name}`}
                        >
                          {INQUIRY_STATUS_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          className="ua-icon-btn"
                          aria-label={`Delete ${name}`}
                          disabled={busy}
                          onClick={() => setPendingDelete(row)}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </TableScroll>
          </div>
          <ListPagination
            page={pagination.page || page}
            pages={pagination.pages || 1}
            total={pagination.total || 0}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            label="Contact inquiry pages"
          />
        </>
      )}

      <InquiryDetail
        inquiry={selected}
        canEdit={canEdit}
        canDelete={canDelete}
        busy={busy}
        onClose={() => setSelected(null)}
        onStatus={changeStatus}
        onDelete={setPendingDelete}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Delete inquiry"
        title={pendingDelete ? `Delete message from ${inquiryFullName(pendingDelete)}?` : ""}
        body="This removes the website contact submission. You can’t undo this."
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}

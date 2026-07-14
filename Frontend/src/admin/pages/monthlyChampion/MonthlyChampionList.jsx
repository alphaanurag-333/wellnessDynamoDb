import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminTableLoaderRow } from "../../components/AdminLoader.jsx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdEditSquare } from "react-icons/md";
import { AiOutlineEye } from "react-icons/ai";
import {
  adminListMonthlyChampions,
  adminRunMonthlyChampionJob,
} from "../../api/monthlyChampions.js";
import { AdminListHeader, AdminStatusBadge, listCountSubtitle, TableCellText } from "../../components/AdminCrud.jsx";
import { logout } from "../../../store/authSlice.js";
import {
  LIST_LIMIT,
  STATUS_OPTIONS,
  localTodayDateOnly,
  monthYearFromDate,
  pillBarStyle,
  pillButtonStyle,
  rankBadge,
} from "./MonthlyChampionShared.js";

export function MonthlyChampionList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminToken = useSelector((s) => s.auth.adminToken);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runningJob, setRunningJob] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listStatus, setListStatus] = useState("");
  const [listDate, setListDate] = useState(() => localTodayDateOnly());
  const jobInFlightRef = useRef(false);

  const listMonth = monthYearFromDate(listDate);

  const loadRows = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const { monthlyChampionPosts, pagination } = await adminListMonthlyChampions(adminToken, {
        page,
        limit: LIST_LIMIT,
        ...(listStatus ? { status: listStatus } : {}),
        ...(listMonth ? { monthYear: listMonth } : {}),
      });
      setRows(monthlyChampionPosts);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [adminToken, dispatch, listDate, listMonth, listStatus, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listStatus, listDate]);

  const pageInfo = useMemo(
    () => `Page ${page} of ${pages} · ${total} champion${total === 1 ? "" : "s"}`,
    [page, pages, total]
  );

  const onRunJob = async () => {
    if (!adminToken || jobInFlightRef.current) return;
    const monthYear = listMonth || undefined;
    jobInFlightRef.current = true;
    setRunningJob(true);
    try {
      const result = await adminRunMonthlyChampionJob(adminToken, { monthYear });
      await Swal.fire({
        icon: "success",
        title: "Job complete",
        html: `
          <p><strong>Month:</strong> ${result.monthYear}</p>
          <p><strong>Matched:</strong> ${result.matchedUsers ?? 0}</p>
          <p><strong>Created:</strong> ${result.created ?? 0} · <strong>Updated:</strong> ${result.updated ?? 0} · <strong>Failed:</strong> ${result.failed ?? 0}</p>
        `,
        timer: 2500,
        showConfirmButton: true,
      });
      if (result.monthYear) {
        setListDate(`${result.monthYear}-01`);
      }
      await loadRows();
    } catch (e) {
      if (e?.status === 401) return dispatch(logout());
      await Swal.fire({ icon: "error", title: "Job failed", text: e.message });
    } finally {
      jobInFlightRef.current = false;
      setRunningJob(false);
    }
  };

  const subtitle = listCountSubtitle(loading, total, "monthly champion", "monthly champions");

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader
          title="Monthly champions"
          subtitle={subtitle}
          actions={
            <button type="button" className="btn btn--primary" onClick={onRunJob} disabled={runningJob}>
              {runningJob ? "Running…" : "Run job"}
            </button>
          }
        />

        <div
          style={{
            ...pillBarStyle,
            gridTemplateColumns: `repeat(${STATUS_OPTIONS.length}, minmax(0, 1fr))`,
            marginBottom: 10,
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value || "all"}
              type="button"
              style={pillButtonStyle(listStatus === opt.value)}
              onClick={() => setListStatus(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="admin-crud-filters">
          <label className="user-field admin-crud-filters__select">
            <span className="user-field__label">Champion month</span>
            <input
              type="date"
              className="user-field__input"
              value={listDate}
              max={localTodayDateOnly()}
              onChange={(e) => setListDate(e.target.value)}
            />
          </label>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>S No.</th>
                <th>User</th>
                <th>Month</th>
                <th>Title</th>
                <th>Avg score</th>
                <th>Status</th>
                <th>Comments</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoaderRow colSpan={8} label="Loading monthly champions..." />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8}>No monthly champions found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row._id}>
                    <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                    <td><TableCellText value={row.user?.name || row.userId} /></td>
                    <td className="data-table__muted">{row.monthYear}</td>
                    <td>{rankBadge(row.rank)}</td>
                    <td className="data-table__muted">{row.averageScore}%</td>
                    <td>
                      <AdminStatusBadge status={row.status} />
                    </td>
                    <td className="data-table__muted">{row.commentCount ?? 0}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn icon-btn--view"
                          title="View"
                          onClick={() => navigate(`/admin/monthly-champions/${row._id}`)}
                        >
                          <AiOutlineEye size={18} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--edit"
                          title="Edit"
                          onClick={() => navigate(`/admin/monthly-champions/${row._id}/edit`)}
                        >
                          <MdEditSquare size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 || total > 0 ? (
          <div className="user-list-pagination">
            <span className="user-list-pagination__info">{pageInfo}</span>
            {pages > 1 ? (
              <div className="user-list-pagination__btns">
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

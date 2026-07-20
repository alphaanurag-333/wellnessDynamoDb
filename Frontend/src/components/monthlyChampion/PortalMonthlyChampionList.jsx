import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { AiOutlineEye } from "react-icons/ai";
import { AdminTableLoaderRow } from "../../admin/components/AdminLoader.jsx";
import {
  AdminListHeader,
  AdminStatusBadge,
  listCountSubtitle,
  TableCellText,
} from "../../admin/components/AdminCrud.jsx";
import {
  LIST_LIMIT,
  localTodayDateOnly,
  monthYearFromDate,
  rankBadge,
} from "../../admin/pages/monthlyChampion/MonthlyChampionShared.js";

function rowId(row) {
  return row?._id || row?.id || "";
}

export function PortalMonthlyChampionList({
  token,
  onUnauthorized,
  basePath,
  listChampions,
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listDate, setListDate] = useState(() => localTodayDateOnly());

  const listMonth = monthYearFromDate(listDate);

  const loadRows = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { monthlyChampionPosts, pagination } = await listChampions(token, {
        page,
        limit: LIST_LIMIT,
        ...(listMonth ? { monthYear: listMonth } : {}),
      });
      setRows(monthlyChampionPosts);
      setPages(pagination?.pages ?? 1);
      setTotal(pagination?.total ?? 0);
    } catch (e) {
      if (e?.status === 401) return onUnauthorized?.();
      await Swal.fire({ icon: "error", title: "Load failed", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized, listChampions, listMonth, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [listDate]);

  const pageInfo = useMemo(
    () => `Page ${page} of ${pages} · ${total} champion${total === 1 ? "" : "s"}`,
    [page, pages, total]
  );
  const subtitle = listCountSubtitle(loading, total, "monthly champion", "monthly champions");

  return (
    <div className="user-page">
      <div className="page-card">
        <AdminListHeader title="Monthly champions" subtitle={subtitle} actions={null} />

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
                rows.map((row, idx) => {
                  const id = rowId(row);
                  return (
                    <tr key={id}>
                      <td className="data-table__muted">{(page - 1) * LIST_LIMIT + idx + 1}</td>
                      <td>
                        <TableCellText value={row.user?.name || row.userId} />
                      </td>
                      <td className="data-table__muted">{row.monthYear}</td>
                      <td>{rankBadge(row.rank)}</td>
                      <td className="data-table__muted">{row.averageScore}%</td>
                      <td>
                        <AdminStatusBadge status={row.status || "active"} />
                      </td>
                      <td className="data-table__muted">{row.commentCount ?? 0}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn icon-btn--view"
                            title="View"
                            onClick={() => navigate(`${basePath}/${id}`)}
                          >
                            <AiOutlineEye size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

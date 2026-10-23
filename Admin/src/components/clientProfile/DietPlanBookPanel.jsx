import { useCallback, useEffect, useState } from "react";
import { adminListDietPlans } from "../../api/dietPlanCatalogApi.js";
import { DIET_PLANS, DIET_PLANS_PAGE_SIZE, dietPlanWordCount } from "../../data/dietPlansData.js";
import { ListPagination } from "../shared.jsx";
import { isMockNumericId } from "../../utils/isMockNumericId.js";

function excerpt(text, max = 220) {
  const raw = String(text || "").trim();
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max).trim()}…`;
}

export function DietPlanBookPanel({ userId, open, onToast }) {
  const live = Boolean(userId) && !isMockNumericId(userId);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DIET_PLANS_PAGE_SIZE,
    total: 0,
    pages: 1,
  });

  const loadPlans = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      if (!live) {
        setPlans(DIET_PLANS);
        setPagination({
          page: 1,
          limit: DIET_PLANS_PAGE_SIZE,
          total: DIET_PLANS.length,
          pages: 1,
        });
        return;
      }
      const { plans: rows, pagination: nextPagination } = await adminListDietPlans(null, {
        page: nextPage,
        limit: DIET_PLANS_PAGE_SIZE,
      });
      const next = rows || [];
      setPlans(next);
      setPagination({
        page: Number(nextPagination?.page) || nextPage,
        limit: Number(nextPagination?.limit) || DIET_PLANS_PAGE_SIZE,
        total: Number(nextPagination?.total) || next.length,
        pages: Number(nextPagination?.pages) || 1,
      });
    } catch (error) {
      onToast?.(error?.message || "Failed to load diet plan book");
      setPlans([]);
      setPagination({ page: 1, limit: DIET_PLANS_PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [live, onToast, page]);

  useEffect(() => {
    if (!open) return;
    loadPlans(page);
  }, [open, page, loadPlans]);

  useEffect(() => {
    if (!open) {
      setExpandedId(null);
      setPage(1);
    }
  }, [open]);

  if (!open) return null;

  const liveCount = plans.filter((entry) => entry.live).length;

  return (
    <div className="ua-cp-food-diet-book">
      <div className="ua-cp-food-diet-book__intro">
        <p>
          Master plans from Config → Diet plans. Coaches can read every live entry when building a client plan.
        </p>
        {!loading ? (
          <span className="ua-cp-food-diet-book__meta">
            {liveCount} live · {pagination.total} total
          </span>
        ) : null}
      </div>

      {loading ? (
        <p className="ua-cp-food-diet__empty">Loading diet plan book…</p>
      ) : plans.length ? (
        <>
          <div className="ua-cfg-dp-grid ua-cp-food-diet-book__grid">
            {plans.map((plan) => {
              const expanded = expandedId === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  className={`ua-cfg-dp-card${expanded ? " is-selected" : ""}`}
                  onClick={() => setExpandedId((current) => (current === plan.id ? null : plan.id))}
                >
                  <div className="ua-cfg-dp-card__top">
                    <strong>{plan.title}</strong>
                    {plan.live ? <span className="ua-cfg-dp-card__live">Live</span> : null}
                  </div>
                  <p className="ua-cfg-dp-card__excerpt">
                    {expanded ? plan.content : excerpt(plan.content)}
                  </p>
                  <span className="ua-cfg-dp-card__words">
                    {dietPlanWordCount(plan.content)} words
                    {!expanded && String(plan.content || "").length > 220 ? " · Click to read full plan" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          {pagination.total > DIET_PLANS_PAGE_SIZE ? (
            <ListPagination
              page={pagination.page}
              pages={pagination.pages}
              total={pagination.total}
              pageSize={DIET_PLANS_PAGE_SIZE}
              onPageChange={setPage}
              label="Diet plan book pagination"
            />
          ) : null}
        </>
      ) : (
        <p className="ua-cp-food-diet__empty">No diet plans in the book yet. Add them under Config → Diet plans.</p>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { adminListConfigDropdowns } from "../api/configDropdownApi.js";
import { fetchDashboardStatistics } from "../api/dashboardApi.js";
import { UpdatedAdminDashboard } from "../components/UpdatedAdminDashboard.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";

export function DashboardPage() {
  const { showToast } = useOutletContext();
  const { token, viewAs } = useViewAs();
  const [statistics, setStatistics] = useState(null);
  const [programCategories, setProgramCategories] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [statisticsResult, categoriesResult] = await Promise.allSettled([
        fetchDashboardStatistics(),
        adminListConfigDropdowns(token, { limit: 50 }),
      ]);
      if (statisticsResult.status === "rejected") throw statisticsResult.reason;
      setStatistics(statisticsResult.value);
      if (categoriesResult.status === "fulfilled") {
        const categoryList = categoriesResult.value.lists.find(
          (list) => list.slug === "program-category" && list.status === "active",
        );
        setProgramCategories(categoryList?.options ?? null);
      } else {
        setProgramCategories(null);
      }
    } catch (error) {
      setStatistics(null);
      setProgramCategories(null);
      setLoadError(error?.message || "Couldn’t load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [token, viewAs]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <UpdatedAdminDashboard
      onToast={showToast}
      statistics={statistics}
      programCategories={programCategories}
      loading={loading}
      loadError={loadError}
      onRetry={loadDashboard}
    />
  );
}

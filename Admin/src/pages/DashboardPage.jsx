import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchActiveConfigDropdown } from "../api/configDropdownApi.js";
import { fetchDashboardStatistics } from "../api/dashboardApi.js";
import { adminListHealthConcerns, mapConcernsToDropdownList } from "../api/healthConcernApi.js";
import { fetchScopedUsers, fetchUsers } from "../api/usersApi.js";
import { AdminDashboard } from "../components/AdminDashboard.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";

async function loadProgramCategories(token, can) {
  if (can("console.cf.view")) {
    const { healthConcerns } = await adminListHealthConcerns(token, { limit: 200 });
    return mapConcernsToDropdownList(healthConcerns || []).options ?? null;
  }
  for (const slug of ["program-category", "health-concern"]) {
    try {
      const list = await fetchActiveConfigDropdown(slug);
      if (list?.options?.length) return list.options;
    } catch {
      /* try the next public catalog */
    }
  }
  return null;
}

export function DashboardPage() {
  const { showToast } = useOutletContext();
  const { token, viewAs, dataScope, can } = useViewAs();
  const [statistics, setStatistics] = useState(null);
  const [healthConcerns, setHealthConcerns] = useState(null);
  const [clients, setClients] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [statisticsResult, concernsResult, clientsResult] = await Promise.allSettled([
        fetchDashboardStatistics(),
        loadProgramCategories(token, can),
        dataScope === "all"
          ? fetchUsers({ page: 1, limit: 200 })
          : fetchScopedUsers({ page: 1, limit: 200 }),
      ]);
      if (statisticsResult.status === "rejected") throw statisticsResult.reason;
      setStatistics(statisticsResult.value);
      setHealthConcerns(concernsResult.status === "fulfilled" ? concernsResult.value : null);
      setClients(
        clientsResult.status === "fulfilled" && Array.isArray(clientsResult.value?.users)
          ? clientsResult.value.users
          : null,
      );
    } catch (error) {
      setStatistics(null);
      setHealthConcerns(null);
      setClients(null);
      setLoadError(error?.message || "Couldn’t load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [token, viewAs, dataScope, can]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <AdminDashboard
      onToast={showToast}
      statistics={statistics}
      healthConcerns={healthConcerns}
      clients={clients}
      loading={loading}
      loadError={loadError}
      onRetry={loadDashboard}
    />
  );
}

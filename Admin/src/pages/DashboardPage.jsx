import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchDashboardStatistics } from "../api/dashboardApi.js";
import { adminListHealthConcerns, mapConcernsToDropdownList } from "../api/healthConcernApi.js";
import { fetchScopedUsers, fetchUsers } from "../api/usersApi.js";
import { AdminDashboard } from "../components/AdminDashboard.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";

export function DashboardPage() {
  const { showToast } = useOutletContext();
  const { token, viewAs, dataScope } = useViewAs();
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
        adminListHealthConcerns(token, { limit: 200 }),
        dataScope === "all"
          ? fetchUsers({ page: 1, limit: 200 })
          : fetchScopedUsers({ page: 1, limit: 200 }),
      ]);
      if (statisticsResult.status === "rejected") throw statisticsResult.reason;
      setStatistics(statisticsResult.value);
      if (concernsResult.status === "fulfilled") {
        const concernList = mapConcernsToDropdownList(concernsResult.value.healthConcerns || []);
        setHealthConcerns(concernList.options ?? null);
      } else {
        setHealthConcerns(null);
      }
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
  }, [token, viewAs, dataScope]);

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

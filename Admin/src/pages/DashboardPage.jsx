import { useCallback, useEffect, useRef, useState } from "react";
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

export function formatDashboardUpdatedLabel(date) {
  if (!date) return "Not loaded yet";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 45_000) return "Updated just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;
  return `Updated ${date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function DashboardPage() {
  const { showToast } = useOutletContext();
  const { token, dataScope, can } = useViewAs();
  const [statistics, setStatistics] = useState(null);
  const [healthConcerns, setHealthConcerns] = useState(null);
  const [clients, setClients] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [updatedLabel, setUpdatedLabel] = useState("Not loaded yet");

  const tokenRef = useRef(token);
  const dataScopeRef = useRef(dataScope);
  const canRef = useRef(can);
  const showToastRef = useRef(showToast);
  tokenRef.current = token;
  dataScopeRef.current = dataScope;
  canRef.current = can;
  showToastRef.current = showToast;

  const loadDashboard = useCallback(async ({ initial = false } = {}) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setLoadError("");
    try {
      const activeToken = tokenRef.current;
      const activeScope = dataScopeRef.current;
      const activeCan = canRef.current;
      const [statisticsResult, concernsResult, clientsResult] = await Promise.allSettled([
        fetchDashboardStatistics(),
        loadProgramCategories(activeToken, activeCan),
        activeScope === "all"
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
      const updatedAt = new Date();
      setLastUpdatedAt(updatedAt);
      setUpdatedLabel(formatDashboardUpdatedLabel(updatedAt));
      if (!initial) showToastRef.current?.("Dashboard refreshed");
    } catch (error) {
      setStatistics(null);
      setHealthConcerns(null);
      setClients(null);
      setLoadError(error?.message || "Couldn’t load dashboard data.");
      if (!initial) showToastRef.current?.(error?.message || "Couldn’t refresh dashboard.");
    } finally {
      if (initial) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard({ initial: true });
  }, [loadDashboard]);

  useEffect(() => {
    if (!lastUpdatedAt) return undefined;
    setUpdatedLabel(formatDashboardUpdatedLabel(lastUpdatedAt));
    const timer = window.setInterval(() => {
      setUpdatedLabel(formatDashboardUpdatedLabel(lastUpdatedAt));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [lastUpdatedAt]);

  return (
    <AdminDashboard
      onToast={showToast}
      statistics={statistics}
      healthConcerns={healthConcerns}
      clients={clients}
      loading={loading}
      refreshing={refreshing}
      updatedLabel={updatedLabel}
      loadError={loadError}
      onRetry={() => loadDashboard({ initial: true })}
      onRefresh={() => loadDashboard({ initial: false })}
    />
  );
}

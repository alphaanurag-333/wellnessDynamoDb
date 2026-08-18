import { useEffect, useRef, useState } from "react";
import { Navigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import {
  getClientProfileDefinition,
  getUserProfile,
  profileFromListUser,
} from "../data/userDetailData.js";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { fetchUser } from "../api/usersApi.js";
import { ClientProfileSidebar, ClientProfileTopbar } from "../components/clientProfile/ClientProfileChrome.jsx";
import {
  AtAGlanceSection,
  BodyAnalyticsSection,
  HealthProgressSection,
  InternalParametersSection,
  LaunchSection,
  FoodSection,
  BmsSection,
  NutritionsSection,
  ReflectionSection,
  PrescriptionSection,
  PresentableSection,
  ExchangeSection,
  ProtocolSection,
  GutResetSection,
  PersonalDetailsSection,
  PlaceholderSection,
} from "../components/clientProfile/ClientProfileSections.jsx";

const PLACEHOLDER_META = {
  food: { title: "Food & Water Tracking", subtitle: "Meals, hydration & nutrition logs." },
  bms: { title: "Body, Mind & Soul (BMS)", subtitle: "Holistic wellness tracking." },
  reflection: { title: "Daily Reflection form", subtitle: "Daily reflection logs and consistency." },
  prescription: { title: "Wellness Prescription", subtitle: "Wellness prescriptions and recommendations." },
  presentable: { title: "Presentable Pics", subtitle: "Client photo requests and approvals." },
  exchange: { title: "Energy Exchange", subtitle: "Energy Exchange program and billing." },
  protocol: { title: "Protocol Settings", subtitle: "Client protocol and settings configuration." },
  gut: { title: "Gut Reset", subtitle: "Gut reset program tracking." },
};

function renderSection(section, user, onToast, onNavigate, onUserUpdated) {
  switch (section) {
    case "glance":
      return <AtAGlanceSection user={user} onToast={onToast} onNavigate={onNavigate} />;
    case "personal":
      return <PersonalDetailsSection user={user} onToast={onToast} onUserUpdated={onUserUpdated} />;
    case "body":
      return <BodyAnalyticsSection user={user} onToast={onToast} />;
    case "internal":
      return <InternalParametersSection user={user} onToast={onToast} />;
    case "launch":
      return <LaunchSection user={user} onToast={onToast} />;
    case "food":
      return <FoodSection user={user} onToast={onToast} />;
    case "bms":
      return <BmsSection user={user} onToast={onToast} />;
    case "nutritions":
      return <NutritionsSection user={user} onToast={onToast} />;
    case "health-progress":
      return <HealthProgressSection user={user} onToast={onToast} />;
    case "reflection":
      return <ReflectionSection user={user} onToast={onToast} />;
    case "prescription":
      return <PrescriptionSection user={user} onToast={onToast} />;
    case "presentable":
      return <PresentableSection user={user} onToast={onToast} />;
    case "exchange":
      return <ExchangeSection user={user} onToast={onToast} />;
    case "protocol":
      return <ProtocolSection user={user} onToast={onToast} />;
    case "gut":
      return <GutResetSection user={user} onToast={onToast} />;
    default: {
      const meta = PLACEHOLDER_META[section];
      return meta ? <PlaceholderSection {...meta} /> : <PlaceholderSection title="Section" />;
    }
  }
}

function isMockNumericId(userId) {
  const numeric = Number(userId);
  return Number.isFinite(numeric) && numeric > 0 && String(numeric) === String(userId);
}

export function UserDetailPage() {
  const { userId } = useParams();
  const { showToast: onToast } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [menuHidden, setMenuHidden] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [user, setUser] = useState(() => getUserProfile(userId));
  const [loading, setLoading] = useState(() => Boolean(userId) && !isMockNumericId(userId));
  const [loadError, setLoadError] = useState("");
  const sectionHistory = useRef([]);

  useEffect(() => {
    let cancelled = false;
    setLoadError("");

    if (!userId) {
      setUser(null);
      setLoading(false);
      return undefined;
    }

    if (isMockNumericId(userId)) {
      setUser(getUserProfile(userId));
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setUser(profileFromListUser(null, userId));

    fetchUser(userId)
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setLoadError("User not found");
          setUser(null);
          return;
        }
        setUser(profileFromListUser(row, userId));
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err?.message || "Failed to load user");
        setUser(profileFromListUser(null, userId));
        onToast?.(err?.message || "Failed to load user");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [onToast, userId]);

  const profileDefinition = getClientProfileDefinition(user);
  const requestedSection = searchParams.get("section");
  const allowedSectionIds = profileDefinition.menu.map((item) => item.id);
  const section = requestedSection && allowedSectionIds.includes(requestedSection)
    ? requestedSection
    : profileDefinition.defaultSection;

  useEffect(() => {
    if (loading || !user || !requestedSection || allowedSectionIds.includes(requestedSection)) {
      return;
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (profileDefinition.defaultSection === "glance") next.delete("section");
      else next.set("section", profileDefinition.defaultSection);
      next.delete("tab");
      next.delete("program");
      next.delete("mode");
      return next;
    }, { replace: true });
  }, [
    allowedSectionIds,
    loading,
    profileDefinition.defaultSection,
    requestedSection,
    setSearchParams,
    user,
  ]);

  if (!loading && !user) {
    return <Navigate to={UPDATED_ADMIN_PATHS.users} replace />;
  }

  if (loading && !user) {
    return (
      <div className="ua-cp-drawer" role="status" aria-label="Loading client profile">
        <p className="ua-page-head__sub" style={{ padding: 24 }}>Loading client…</p>
      </div>
    );
  }

  function setSection(next, { fromBack = false, tab, program, mode } = {}) {
    const safeNext = allowedSectionIds.includes(next)
      ? next
      : profileDefinition.defaultSection;
    if (!fromBack && safeNext !== section) {
      sectionHistory.current = [...sectionHistory.current, section];
    }
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (safeNext === "glance") {
        p.delete("section");
        p.delete("tab");
        p.delete("program");
        p.delete("mode");
      } else {
        p.set("section", safeNext);
        if (safeNext === "launch" && tab) p.set("tab", tab);
        else if (safeNext === "bms" && tab) p.set("tab", tab);
        else if (safeNext !== "food") p.delete("tab");
        if (safeNext === "health-progress" && program) p.set("program", program);
        else p.delete("program");
        if (safeNext === "bms") p.set("mode", "detailed");
        else if (mode) p.set("mode", mode);
        else if (safeNext !== "food") p.delete("mode");
      }
      return p;
    }, { replace: true });
  }

  function goBack() {
    const prev = sectionHistory.current.pop();
    if (prev) {
      setSection(prev, { fromBack: true });
    } else if (section !== profileDefinition.defaultSection) {
      setSection(profileDefinition.defaultSection, { fromBack: true });
    }
  }

  const showBack =
    sectionHistory.current.length > 0 ||
    section !== profileDefinition.defaultSection;

  return (
    <div
      className={`ua-cp-drawer${menuHidden ? " ua-cp-drawer--menu-hidden" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Client profile"
    >
      <ClientProfileTopbar
        menuHidden={menuHidden}
        onToggleMenu={() => setMenuHidden((h) => !h)}
        showBack={showBack}
        onBack={goBack}
        onSave={() => onToast("Profile saved")}
      />
      {loadError ? (
        <p className="ua-page-head__sub" style={{ padding: "8px 16px", color: "#b42318" }}>{loadError}</p>
      ) : null}
      <div className="ua-cp-body">
        <ClientProfileSidebar
          user={user}
          menu={profileDefinition.menu}
          activeSection={section}
          onSectionChange={(id) => setSection(id)}
          hidden={menuHidden}
          showAllTags={showAllTags}
          onToggleTags={() => setShowAllTags(true)}
        />
        <div className="ua-cp-main" data-drawer-scroll="1">
          <div className="ua-cp-main__inner">
            {loading ? (
              <p className="ua-page-head__sub">Loading client…</p>
            ) : (
              renderSection(section, user, onToast, setSection, (updatedRow) => {
                setUser(profileFromListUser(updatedRow, userId));
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

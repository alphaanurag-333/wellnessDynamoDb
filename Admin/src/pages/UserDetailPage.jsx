import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import {
  getClientProfileDefinition,
  profileFromListUser,
} from "../data/userDetailData.js";
import { UPDATED_ADMIN_PATHS } from "../data/dashboardData.js";
import { fetchUser } from "../api/usersApi.js";
import { BrandLoader } from "../components/BrandLoader.jsx";
import { ClientProfileSidebar, ClientProfileTopbar } from "../components/clientProfile/ClientProfileChrome.jsx";
import { ClientProfileSectionGate } from "../components/clientProfile/ClientProfileSectionGate.jsx";
import { useViewAs } from "../context/ViewAsContext.jsx";
import {
  filterClientProfileMenu,
} from "../utils/clientProfilePermissions.js";
import { isMockNumericId } from "../utils/isMockNumericId.js";
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
  ConsultationSection,
  MedicalConditionsSection,
  PlaceholderSection,
} from "../components/clientProfile/ClientProfileSections.jsx";
import { CounsellingSection } from "../components/clientProfile/CounsellingSection.jsx";

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

function renderSection(section, user, onToast, onNavigate, onUserUpdated, sectionNav) {
  switch (section) {
    case "glance":
      return <AtAGlanceSection user={user} onToast={onToast} onNavigate={onNavigate} onUserUpdated={onUserUpdated} />;
    case "personal":
      return (
        <PersonalDetailsSection
          user={user}
          onToast={onToast}
          onUserUpdated={onUserUpdated}
          showBack={sectionNav?.showBack}
          onBack={sectionNav?.onBack}
        />
      );
    case "body":
      return <BodyAnalyticsSection user={user} onToast={onToast} />;
    case "medical":
      return <MedicalConditionsSection user={user} onToast={onToast} />;
    case "internal":
      return <InternalParametersSection user={user} onToast={onToast} onUserUpdated={onUserUpdated} />;
    case "launch":
      return <LaunchSection user={user} onToast={onToast} onUserUpdated={onUserUpdated} />;
    case "food":
      return <FoodSection user={user} onToast={onToast} onUserUpdated={onUserUpdated} />;
    case "bms":
      return <BmsSection user={user} onToast={onToast} onUserUpdated={onUserUpdated} />;
    case "nutritions":
      return <NutritionsSection user={user} onToast={onToast} />;
    case "health-progress":
      return <HealthProgressSection user={user} onToast={onToast} />;
    case "reflection":
      return <ReflectionSection user={user} onToast={onToast} />;
    case "prescription":
      return <PrescriptionSection user={user} onToast={onToast} />;
    case "presentable":
      return <PresentableSection user={user} onToast={onToast} onUserUpdated={onUserUpdated} />;
    case "exchange":
      return <ExchangeSection user={user} onToast={onToast} />;
    case "protocol":
      return <ProtocolSection user={user} onToast={onToast} />;
    case "gut":
      return <GutResetSection user={user} onToast={onToast} />;
    case "consultation":
      return <ConsultationSection user={user} onToast={onToast} />;
    case "counselling":
      return <CounsellingSection user={user} onToast={onToast} />;
    default: {
      const meta = PLACEHOLDER_META[section]; 
      return meta ? <PlaceholderSection {...meta} /> : <PlaceholderSection title="Section" />;
    }
  }
}

export function UserDetailPage() {
  const { userId } = useParams();
  const { showToast: onToast } = useOutletContext();
  const { can } = useViewAs();
  const [searchParams, setSearchParams] = useSearchParams();
  const [menuHidden, setMenuHidden] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const demoRouteBlocked = isMockNumericId(userId);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(userId) && !isMockNumericId(userId));
  const [loadError, setLoadError] = useState(() => (
    isMockNumericId(userId)
      ? "Demo profile URLs are disabled. Real clients use UUID ids from the API."
      : ""
  ));
  const sectionHistory = useRef([]);

  useEffect(() => {
    let cancelled = false;
    setLoadError("");

    if (!userId) {
      setUser(null);
      setLoading(false);
      return undefined;
    }

    // `/users/1` style ids were local seed profiles — never show them as live clients.
    if (isMockNumericId(userId)) {
      setUser(null);
      setLoading(false);
      setLoadError("Demo profile URLs are disabled. Real clients use UUID ids from the API.");
      return undefined;
    }

    setLoading(true);
    setUser(null);

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
        setUser(null);
        onToast?.(err?.message || "Failed to load user");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [onToast, userId]);

  const profileDefinition = useMemo(() => {
    const base = getClientProfileDefinition(user);
    const menu = filterClientProfileMenu(base.menu, can);
    let defaultSection = base.defaultSection;
    if (!menu.some((item) => item.id === defaultSection)) {
      defaultSection = menu[0]?.id || base.defaultSection;
    }
    return { ...base, menu, defaultSection };
  }, [user, can]);

  const requestedSection = searchParams.get("section");
  const allowedSectionIds = profileDefinition.menu.map((item) => item.id);
  const section =
    requestedSection && allowedSectionIds.includes(requestedSection)
      ? requestedSection
      : profileDefinition.defaultSection;
  const activeMenuItem =
    profileDefinition.menu.find((item) => item.id === section) ||
    profileDefinition.menu[0] ||
    null;

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

  if (demoRouteBlocked || (!loading && !user && loadError)) {
    return (
      <div className="ua-cp-drawer" role="status" aria-label="Client profile unavailable">
        <div className="ua-users-empty" style={{ paddingTop: 80 }}>
          <div className="ua-users-empty__title">
            {demoRouteBlocked ? "Demo profile unavailable" : "Client not found"}
          </div>
          <p className="ua-users-empty__sub">
            {demoRouteBlocked
              ? `“/users/${userId}” is a legacy numeric demo id. Sample clients are never shown as live profiles — open a real UUID from Users.`
              : (loadError || "This client could not be loaded from the API.")}
          </p>
          <Link to={UPDATED_ADMIN_PATHS.users} replace className="btn btn--outline">
            Back to Users
          </Link>
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    return <Navigate to={UPDATED_ADMIN_PATHS.users} replace />;
  }

  if (loading && !user) {
    return (
      <div className="ua-cp-drawer" role="status" aria-label="Loading client profile">
        <BrandLoader variant="page" label="Loading client…" />
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
          compact={profileDefinition.mode === "compact"}
        />
        <div className="ua-cp-main" data-drawer-scroll="1">
          <div className="ua-cp-main__inner">
            {loading ? (
              <BrandLoader variant="page" label="Loading client…" />
            ) : (
              <>
                {showBack && section !== "personal" ? (
                  <button
                    type="button"
                    className="ua-cp-section-back"
                    onClick={goBack}
                    title="Back to previous screen"
                  >
                    ‹ Back
                  </button>
                ) : null}
                <ClientProfileSectionGate section={section} label={activeMenuItem?.label}>
                  {renderSection(section, user, onToast, setSection, (updatedRow) => {
                    setUser(profileFromListUser(updatedRow, userId));
                  }, { showBack, onBack: goBack })}
                </ClientProfileSectionGate>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

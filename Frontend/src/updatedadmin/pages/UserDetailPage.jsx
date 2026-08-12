import { useRef, useState } from "react";
import { Navigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { getUserProfile } from "../data/userDetailData.js";
import { ClientProfileSidebar, ClientProfileTopbar } from "../components/clientProfile/ClientProfileChrome.jsx";
import {
  AtAGlanceSection,
  BodyAnalyticsSection,
  InternalParametersSection,
  LaunchSection,
  NutritionsSection,
  PersonalDetailsSection,
  PlaceholderSection,
} from "../components/clientProfile/ClientProfileSections.jsx";

const PLACEHOLDER_META = {
  food: { title: "Food & Water Tracking", subtitle: "Meals, hydration & nutrition logs." },
  bms: { title: "Body, Mind & Soul (BMS)", subtitle: "Holistic wellness tracking." },
};

function renderSection(section, user, onToast) {
  switch (section) {
    case "glance":
      return <AtAGlanceSection user={user} onToast={onToast} />;
    case "personal":
      return <PersonalDetailsSection user={user} onToast={onToast} />;
    case "body":
      return <BodyAnalyticsSection onToast={onToast} />;
    case "internal":
      return <InternalParametersSection user={user} onToast={onToast} />;
    case "launch":
      return <LaunchSection user={user} onToast={onToast} />;
    case "nutritions":
      return <NutritionsSection onToast={onToast} />;
    default: {
      const meta = PLACEHOLDER_META[section];
      return meta ? <PlaceholderSection {...meta} /> : <PlaceholderSection title="Section" />;
    }
  }
}

export function UserDetailPage() {
  const { userId } = useParams();
  const { showToast: onToast } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [menuHidden, setMenuHidden] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const sectionHistory = useRef([]);

  const user = getUserProfile(userId);
  const section = searchParams.get("section") || "glance";

  if (!user) {
    return <Navigate to="/updatedadmin/users" replace />;
  }

  function setSection(next, { fromBack = false } = {}) {
    if (!fromBack && next !== section) {
      sectionHistory.current = [...sectionHistory.current, section];
    }
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next === "glance") p.delete("section");
      else p.set("section", next);
      return p;
    }, { replace: true });
  }

  function goBack() {
    const prev = sectionHistory.current.pop();
    if (prev) {
      setSection(prev, { fromBack: true });
    } else if (section !== "glance") {
      setSection("glance", { fromBack: true });
    }
  }

  const showBack = sectionHistory.current.length > 0 || section !== "glance";

  return (
    <div className="ua-cp-drawer ua-page-enter" role="dialog" aria-modal="true" aria-label="Client profile">
      <ClientProfileTopbar
        menuHidden={menuHidden}
        onToggleMenu={() => setMenuHidden((h) => !h)}
        showBack={showBack}
        onBack={goBack}
        onSave={() => onToast("Profile saved")}
      />
      <div className={`ua-cp-body${menuHidden ? " ua-cp-body--menu-hidden" : ""}`}>
        <ClientProfileSidebar
          user={user}
          activeSection={section}
          onSectionChange={(id) => setSection(id)}
          hidden={menuHidden}
          showAllTags={showAllTags}
          onToggleTags={() => setShowAllTags(true)}
        />
        <div className="ua-cp-main" data-drawer-scroll="1">
          <div className="ua-cp-main__inner">
            {renderSection(section, user, onToast)}
          </div>
        </div>
      </div>
    </div>
  );
}

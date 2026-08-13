import { useRef, useState } from "react";
import { Navigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { getUserProfile } from "../data/userDetailData.js";
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

function renderSection(section, user, onToast, onNavigate) {
  switch (section) {
    case "glance":
      return <AtAGlanceSection user={user} onToast={onToast} onNavigate={onNavigate} />;
    case "personal":
      return <PersonalDetailsSection user={user} onToast={onToast} />;
    case "body":
      return <BodyAnalyticsSection onToast={onToast} />;
    case "internal":
      return <InternalParametersSection user={user} onToast={onToast} />;
    case "launch":
      return <LaunchSection user={user} onToast={onToast} />;
    case "food":
      return <FoodSection onToast={onToast} />;
    case "bms":
      return <BmsSection onToast={onToast} />;
    case "nutritions":
      return <NutritionsSection onToast={onToast} />;
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

  function setSection(next, { fromBack = false, tab, program, mode } = {}) {
    if (!fromBack && next !== section) {
      sectionHistory.current = [...sectionHistory.current, section];
    }
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next === "glance") {
        p.delete("section");
        p.delete("tab");
        p.delete("program");
        p.delete("mode");
      } else {
        p.set("section", next);
        if (next === "launch" && tab) p.set("tab", tab);
        else if (next === "bms" && tab) p.set("tab", tab);
        else if (next !== "food") p.delete("tab");
        if (next === "health-progress" && program) p.set("program", program);
        else p.delete("program");
        if (next === "bms") p.set("mode", "detailed");
        else if (mode) p.set("mode", mode);
        else if (next !== "food") p.delete("mode");
      }
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
      <div className="ua-cp-body">
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
            {renderSection(section, user, onToast, setSection)}
          </div>
        </div>
      </div>
    </div>
  );
}

import { FadeLoader } from "react-spinners";

/** Keep in sync with `--admin-brand-blue-soft` in admin-panel.css */
export const ADMIN_LOADER_COLOR = "#2c4f78";

export const ADMIN_PAGE_LOADER_PROPS = {
  height: 12,
  margin: -1,
  radius: 20,
  width: 4,
  color: ADMIN_LOADER_COLOR,
};

export const ADMIN_SUBMIT_LOADER_PROPS = {
  height: 10,
  margin: 2,
  radius: 10,
  width: 3,
  color: "#ffffff",
};

export function AdminSubmitLoader() {
  return <FadeLoader {...ADMIN_SUBMIT_LOADER_PROPS} aria-hidden="true" />;
}

/** Centered FadeLoader block (table cell, card body, etc.). */
export function AdminPageLoader({ label = "Loading...", className = "" }) {
  return (
    <div
      className={`static-cms-loading${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="admin-loader__inner">
        <FadeLoader {...ADMIN_PAGE_LOADER_PROPS} />
        {label ? <span>{label}</span> : null}
      </div>
    </div>
  );
}

/** Full-page loading shell for view/edit routes. */
export function AdminPageLoadingState({ label = "Loading…", wrapClassName = "user-page" }) {
  return (
    <div className={wrapClassName}>
      <div className="page-card">
        <AdminPageLoader label={label} />
      </div>
    </div>
  );
}

/** Table row loader. */
export function AdminTableLoaderRow({ colSpan = 7, label = "Loading…" }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <AdminPageLoader label={label} />
      </td>
    </tr>
  );
}

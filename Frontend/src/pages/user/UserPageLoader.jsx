import { FadeLoader } from "react-spinners";

export const USER_PAGE_LOADER_PROPS = {
  height: 12,
  margin: -1,
  radius: 20,
  width: 4,
  color: "#4f46e5",
};

/** Compact loader for primary buttons (save / create). */
export const USER_SUBMIT_LOADER_PROPS = {
  height: 10,
  margin: 2,
  radius: 10,
  width: 3,
  color: "#ffffff",
};

export function UserSubmitLoader() {
  return <FadeLoader {...USER_SUBMIT_LOADER_PROPS} aria-hidden="true" />;
}

/** Centered FadeLoader block (table cell, card body, etc.). */
export function UserPageLoader({ label = "Loading...", className = "" }) {
  return (
    <div
      className={`static-cms-loading${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
        <FadeLoader {...USER_PAGE_LOADER_PROPS} />
        {label ? <span>{label}</span> : null}
      </div>
    </div>
  );
}

/** Full-page loading shell for view/edit routes. */
export function UserPageLoadingState({ label = "Loading user…" }) {
  return (
    <div className="user-page">
      <div className="page-card">
        <UserPageLoader label={label} />
      </div>
    </div>
  );
}

/** Table row loader (user list). */
export function UserTableLoaderRow({ colSpan = 7, label = "Loading users…" }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <UserPageLoader label={label} />
      </td>
    </tr>
  );
}

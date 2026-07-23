import { Link, useLocation } from "react-router-dom";

function notFoundContext(pathname) {
  if (pathname.startsWith("/admin")) {
    return {
      description:
        "That page does not exist, or the item may have been removed. Check the address or go back to the dashboard.",
      to: "/admin/dashboard",
      label: "Back to dashboard",
    };
  }
  if (pathname.startsWith("/coach")) {
    return {
      description:
        "That page does not exist, or the item may have been removed. Check the address or go back to the dashboard.",
      to: "/coach/dashboard",
      label: "Back to dashboard",
    };
  }
  if (pathname.startsWith("/assistant")) {
    return {
      description:
        "That page does not exist, or the item may have been removed. Check the address or go back to the dashboard.",
      to: "/assistant/dashboard",
      label: "Back to dashboard",
    };
  }
  if (pathname.startsWith("/panel")) {
    return {
      description:
        "That page does not exist, or the item may have been removed. Check the address or go back to the dashboard.",
      to: "/panel/dashboard",
      label: "Back to dashboard",
    };
  }
  return {
    description:
      "That page does not exist, or it may have been moved. Check the address or return to the home page.",
    to: "/",
    label: "Back to home",
  };
}

export function NotFoundPage() {
  const { pathname } = useLocation();
  const { description, to, label } = notFoundContext(pathname);

  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <div className="page-card not-found-page__card">
        <div className="not-found-page__badge" aria-hidden="true">
          <span className="not-found-page__badge-text">404</span>
        </div>
        <h1 id="not-found-title" className="not-found-page__title">
          Page not found
        </h1>
        <p className="not-found-page__desc">{description}</p>
        <div className="not-found-page__actions">
          <Link to={to} className="btn btn--primary">
            {label}
          </Link>
        </div>
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";

const VARIANT_CLASS = {
  primary: "site-btn--primary",
  secondary: "site-btn--secondary",
  green: "site-btn--green",
  onGradient: "site-btn--on-gradient",
};

export function SiteButton({
  children,
  variant = "primary",
  href,
  to,
  block = false,
  className = "",
  type = "button",
  ...rest
}) {
  const classes = [
    "site-btn",
    VARIANT_CLASS[variant] || VARIANT_CLASS.primary,
    block ? "site-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    const isExternal = /^https?:\/\//i.test(href);
    if (isExternal) {
      return (
        <a className={classes} href={href} target="_blank" rel="noopener noreferrer" {...rest}>
          {children}
        </a>
      );
    }
    if (href.startsWith("/")) {
      return (
        <Link className={classes} to={href} {...rest}>
          {children}
        </Link>
      );
    }
    return (
      <a className={classes} href={href} {...rest}>
        {children}
      </a>
    );
  }

  if (to) {
    return (
      <Link className={classes} to={to} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} type={type} {...rest}>
      {children}
    </button>
  );
}

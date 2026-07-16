export function SiteCard({ children, className = "", flat = false, as: Tag = "div", ...rest }) {
  const classes = ["site-card site-cards", flat ? "site-card--flat" : "", className].filter(Boolean).join(" ");
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}

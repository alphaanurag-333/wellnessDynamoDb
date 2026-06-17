export function AuthPasswordToggle({ visible, onToggle, className = "" }) {
  const label = visible ? "Hide" : "Show";

  return (
    <button
      type="button"
      className={className ? `auth-password-toggle ${className}` : "auth-password-toggle"}
      aria-label={`${label} password`}
      aria-pressed={visible}
      onClick={(e) => {
        e.preventDefault();
        onToggle?.();
      }}
    >
      {label}
    </button>
  );
}
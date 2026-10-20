import { useLayoutEffect } from "react";

const WEBSITE = "https://irwellness.in/";

/** Client-side visits to /share. Full page loads are redirected earlier by share-redirect.js. */
export function ShareAppPage() {
  useLayoutEffect(() => {
    const target =
      typeof window.irwShareAppDestination === "function"
        ? window.irwShareAppDestination()
        : WEBSITE;
    window.location.replace(target);
  }, []);

  return (
    <p style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", marginTop: "2rem" }}>
      Opening IR Wellness…
    </p>
  );
}

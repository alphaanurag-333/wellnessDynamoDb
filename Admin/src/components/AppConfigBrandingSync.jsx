import { useEffect } from "react";
import { useAppSelector } from "../store/hooks.js";
import { selectFaviconUrl } from "../store/slices/appConfigSlice.js";

/** Keeps document favicon in sync with App Config (login + authenticated shell). */
export function AppConfigBrandingSync() {
  const faviconUrl = useAppSelector(selectFaviconUrl);

  useEffect(() => {
    const href = faviconUrl?.trim();
    if (!href) return;

    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [faviconUrl]);

  return null;
}

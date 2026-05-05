import { useSelector } from "react-redux";
import { selectAppFooterText } from "../store/appConfigSelectors.js";

const DEFAULT_FOOTER_TEXT = "© 2026 Wellness. All rights reserved.";

export function Footer() {
  const footerText = useSelector(selectAppFooterText);
  return <footer className="admin-footer">{footerText || DEFAULT_FOOTER_TEXT}</footer>;
}

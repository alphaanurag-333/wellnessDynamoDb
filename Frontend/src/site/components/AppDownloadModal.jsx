import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import QRCode from "qrcode";
import { useSelector } from "react-redux";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import { selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { useSiteConfig } from "../hooks/useSiteConfig.js";
import apkScreenshot from "../images/apk.png";
import { AppDownloadButtons } from "./AppDownloadButtons.jsx";

export function AppDownloadModal({ open, onClose }) {
  const { appName, mobileApp, consultancyAmount } = useSiteConfig();
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const logoSrc = brandLogoUrl || defaultLogo;
  const [qrDataUrl, setQrDataUrl] = useState("");

  const qrTarget = useMemo(() => {
    return (
      mobileApp.primaryUrl
      || mobileApp.androidUrl
      || mobileApp.iosUrl
      || (typeof window !== "undefined" ? window.location.origin : "")
    );
  }, [mobileApp.androidUrl, mobileApp.iosUrl, mobileApp.primaryUrl]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    let cancelled = false;
    if (!open || !qrTarget) {
      setQrDataUrl("");
      return undefined;
    }
    QRCode.toDataURL(qrTarget, {
      width: 220,
      margin: 1,
      color: { dark: "#16233f", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [open, qrTarget]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="app-dl-modal-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="app-dl-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-dl-modal-title"
      >
        <button
          type="button"
          className="app-dl-modal__close"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="app-dl-modal__grid">
          <div className="app-dl-modal__phone" aria-hidden={!apkScreenshot}>
            <div className="app-dl-modal__phone-frame">
              <img
                className="app-dl-modal__screenshot"
                src={apkScreenshot}
                alt={`${appName} mobile app preview`}
              />
            </div>
          </div>

          <div className="app-dl-modal__copy">
            <div className="app-dl-modal__brand">
              <img src={logoSrc} alt="" className="app-dl-modal__logo" />
              <span>{appName}</span>
            </div>

            <p className="app-dl-modal__eyebrow">Book on the app</p>
            <h2 id="app-dl-modal-title" className="app-dl-modal__title">
              Download {appName} to book your consultation
            </h2>
            <p className="app-dl-modal__text">
              {consultancyAmount
                ? `Consultations from ${consultancyAmount}. `
                : ""}
              Get the app on your phone — scan the QR code or open the store links below.
            </p>

            <div className="app-dl-modal__stores">
              <AppDownloadButtons tone="dark" appleFirst />
            </div>

            <div className="app-dl-modal__qr-block">
              <div className="app-dl-modal__qr">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR code to download the app" />
                ) : (
                  <span className="app-dl-modal__qr-fallback">QR</span>
                )}
              </div>
              <div className="app-dl-modal__qr-copy">
                <strong>Scan to download</strong>
                <span>Point your phone camera at the code to open the app store.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

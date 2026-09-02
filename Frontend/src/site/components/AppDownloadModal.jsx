import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import QRCode from "qrcode";
import { useSelector } from "react-redux";
import defaultLogo from "../../assets/logo/defaultlogo.png";
import { selectApkLogoLightUrl, selectLoginBrandLogoUrl } from "../../store/appConfigSelectors.js";
import { useSiteConfig } from "../hooks/useSiteConfig.js";
import apkScreenshot from "../images/apk.png";
import { AppDownloadButtons } from "./AppDownloadButtons.jsx";
import "./AppDownloadModal.css";

async function toQrDataUrl(target) {
  if (!target) return "";
  try {
    return await QRCode.toDataURL(target, {
      width: 240,
      margin: 2,
      color: { dark: "#0f1f38", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  } catch {
    return "";
  }
}

function QrCard({ dataUrl, target, label, hint }) {
  return (
    <div className="app-dl-modal__qr-card">
      <div className={`app-dl-modal__qr${dataUrl ? "" : " is-empty"}`}>
        {dataUrl ? (
          <img src={dataUrl} alt={`${label} QR code`} />
        ) : (
          <span className="app-dl-modal__qr-fallback">
            {target
              ? "Generating…"
              : `Add ${label} in Admin → Social links`}
          </span>
        )}
      </div>
      <div className="app-dl-modal__qr-copy">
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
    </div>
  );
}

export function AppDownloadModal({ open, onClose }) {
  const { appName, mobileApp } = useSiteConfig();
  const brandLogoUrl = useSelector(selectLoginBrandLogoUrl);
  const apkLogoUrl = useSelector(selectApkLogoLightUrl);
  const logoSrc = brandLogoUrl || defaultLogo;
  // const apkScreenshotSrc = apkLogoUrl || apkScreenshot;
  const apkScreenshotSrc =  apkScreenshot;
  const [iosQrDataUrl, setIosQrDataUrl] = useState("");
  const [playQrDataUrl, setPlayQrDataUrl] = useState("");

  const iosQrTarget = useMemo(() => {
    return mobileApp.iosQrUrl || mobileApp.iosUrl || mobileApp.qrUrl || "";
  }, [mobileApp.iosQrUrl, mobileApp.iosUrl, mobileApp.qrUrl]);

  const playQrTarget = useMemo(() => {
    return mobileApp.playQrUrl || mobileApp.androidUrl || "";
  }, [mobileApp.playQrUrl, mobileApp.androidUrl]);

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
    if (!open) {
      setIosQrDataUrl("");
      setPlayQrDataUrl("");
      return undefined;
    }
    Promise.all([toQrDataUrl(iosQrTarget), toQrDataUrl(playQrTarget)]).then(([ios, play]) => {
      if (cancelled) return;
      setIosQrDataUrl(ios);
      setPlayQrDataUrl(play);
    });
    return () => {
      cancelled = true;
    };
  }, [open, iosQrTarget, playQrTarget]);

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
          <div className="app-dl-modal__phone">
            <div className="app-dl-modal__phone-frame">
              <img
                className="app-dl-modal__screenshot"
                src={apkScreenshotSrc}
                alt={`${appName} mobile app preview`}
              />
            </div>
          </div>

          <div className="app-dl-modal__copy">
            {/* <div className="app-dl-modal__brand">
              <img src={logoSrc} alt="" className="app-dl-modal__logo" />
              <span>{appName}</span>
            </div> */}

            <p className="app-dl-modal__eyebrow">Book on the app</p>
            <h2 id="app-dl-modal-title" className="app-dl-modal__title">
              Download {appName} to book your consultation
            </h2>
            <p className="app-dl-modal__text app-dl-modal__text--desktop">
              Get the app on your phone — scan a QR code or open the store links below.
            </p>
            <p className="app-dl-modal__text app-dl-modal__text--mobile">
              Get the app on your phone — tap a store button or scan a QR code.
            </p>

            <div className="app-dl-modal__stores">
              <AppDownloadButtons tone="dark" appleFirst />
            </div>

            <div className="app-dl-modal__qr-block app-dl-modal__qr-block--dual">
              <QrCard
                dataUrl={iosQrDataUrl}
                target={iosQrTarget}
                label="App Store QR"
                hint="Scan to open the App Store."
              />
              <QrCard
                dataUrl={playQrDataUrl}
                target={playQrTarget}
                label="Google Play QR"
                hint="Scan to open Google Play."
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AppDownloadModal } from "./AppDownloadModal.jsx";

const AppDownloadModalContext = createContext({
  open: false,
  openAppDownload: () => {},
  closeAppDownload: () => {},
});

export function AppDownloadModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openAppDownload = useCallback(() => setOpen(true), []);
  const closeAppDownload = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, openAppDownload, closeAppDownload }),
    [open, openAppDownload, closeAppDownload],
  );

  return (
    <AppDownloadModalContext.Provider value={value}>
      {children}
      <AppDownloadModal open={open} onClose={closeAppDownload} />
    </AppDownloadModalContext.Provider>
  );
}

export function useAppDownloadModal() {
  return useContext(AppDownloadModalContext);
}

/** Button/link that opens the app download popup instead of navigating away. */
export function BookConsultationButton({
  className = "",
  children = "Book a consultation",
  onClick,
  type = "button",
  ...rest
}) {
  const { openAppDownload } = useAppDownloadModal();

  return (
    <button
      type={type}
      className={className}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        openAppDownload();
      }}
    >
      {children}
    </button>
  );
}

export function ImageTypeIcon({ className = "ua-cfg-gl-card__svg" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" />
      <path
        d="M4.5 16.5 9 12l3 3 3.5-4.5 4 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AudioTypeIcon({ className = "ua-cfg-gl-card__svg" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 18V6l10-2v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="18" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17" cy="16" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function VideoTypeIcon({ className = "ua-cfg-gl-card__svg" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M15 10.2 20.5 7v10L15 13.8V10.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MediaTypeIcon({ type }) {
  if (type === "audio") return <AudioTypeIcon />;
  if (type === "video") return <VideoTypeIcon />;
  return <ImageTypeIcon />;
}

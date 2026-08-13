const stroke = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function IconUsers() {
  return (
    <svg {...stroke}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconSeek() {
  return (
    <svg {...stroke}>
      <path d="M13 2 3 14h9l-1 8 10-12h-9z" />
    </svg>
  );
}

export function IconActive() {
  return (
    <svg {...stroke}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function IconPending() {
  return (
    <svg {...stroke}>
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function IconClient() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconEagles() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.9 3.5 1.6-6.8L1.4 9.1l7-.6z" />
    </svg>
  );
}

export function IconStar() {
  return (
    <svg {...stroke}>
      <path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.9 3.5 1.6-6.8L1.4 9.1l7-.6z" />
    </svg>
  );
}

export function IconImage() {
  return (
    <svg {...stroke}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

export function IconVideo() {
  return (
    <svg {...stroke}>
      <path d="m16 13 5.2 3.5a1 1 0 0 0 1.5-.86V8.36a1 1 0 0 0-1.5-.86L16 11" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}

export function IconBell() {
  return (
    <svg {...stroke}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function IconZap() {
  return (
    <svg {...stroke}>
      <path d="M13 2 3 14h9l-1 8 10-12h-9z" />
    </svg>
  );
}

const STAT_ICONS = {
  users: IconUsers,
  seek: IconSeek,
  active: IconActive,
  pending: IconPending,
  client: IconClient,
  eagles: IconEagles,
  star: IconStar,
  image: IconImage,
  video: IconVideo,
  bell: IconBell,
  zap: IconZap,
};

export function StatIcon({ name }) {
  const Cmp = STAT_ICONS[name];
  return Cmp ? <Cmp /> : null;
}

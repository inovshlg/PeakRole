/** Inline SVG icons (no icon font download). Paths use a 24×24 grid, stroke style. */
const PATHS = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.3-4.3',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9Zm4.3 13a1.94 1.94 0 0 0 3.4 0',
  chat: 'M4 5h16v11H8l-4 4V5Z',
  bookmark: 'M6 3h12v18l-6-4-6 4V3Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  briefcase: 'M3 7h18v13H3V7Zm5 0V4h8v3M3 13h18',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 1 1 14 0c0 5.8-7 12-7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5v4l3 2',
  money: 'M3 6h18v12H3V6Zm9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM6 9v.01M18 15v.01',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  building: 'M4 21V5l8-3v19M12 9h8v12M8 7v.01M8 11v.01M8 15v.01M16 13v.01M16 17v.01M2 21h20',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  check: 'm5 12 5 5L20 7',
  checkCircle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4 9 3 3 5-6',
  close: 'M6 6l12 12M18 6 6 18',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  arrowRight: 'M5 12h14m-6-6 6 6-6 6',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-9 9h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z',
  truck: 'M2 6h12v10H2V6Zm12 4h4l3 3v3h-7v-6ZM6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  warehouse: 'M3 21V9l9-5 9 5v12M7 21v-8h10v8M7 17h10',
  sparkle: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',
  copy: 'M9 9h11v11H9V9ZM5 15H4V4h11v1',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  calendar: 'M4 6h16v15H4V6Zm0 5h16M8 3v4m8-4v4',
  trend: 'm3 17 6-6 4 4 8-8m0 0h-6m6 0v6',
  home: 'M3 11 12 3l9 8v10h-6v-6H9v6H3V11Z',
  logout: 'M15 4h5v16h-5M10 8l-4 4 4 4M6 12h11',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5L9 5.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.5 2.6h5l.5-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 8v5m0-8v.01',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Z',
  remote: 'M3 5h18v11H3V5Zm5 15h8m-4-4v4',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Zm-3 9 2 2 4-4',
};

export default function Icon({ name, className = 'h-5 w-5', filled = false, strokeWidth = 1.8 }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

import type { ReactNode } from 'react'

const P = (d: string) => <path d={d} />

const ICONS = {
  home: (
    <>
      {P('M3 10.5 12 3l9 7.5')}
      {P('M5 9.5V21h14V9.5')}
      {P('M9 21v-6h6v6')}
    </>
  ),
  folder: P('M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'),
  inbox: (
    <>
      {P('M22 13h-5.5l-1.5 2.5h-6L7.5 13H2')}
      {P('M5.4 5.6 2 13v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5l-3.4-7.4A2 2 0 0 0 16.8 4.5H7.2a2 2 0 0 0-1.8 1.1z')}
    </>
  ),
  file: (
    <>
      {P('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z')}
      {P('M14 2v6h6')}
      {P('M9 13h6M9 17h6')}
    </>
  ),
  radio: (
    <>
      <circle cx="12" cy="12" r="1.6" />
      {P('M8.5 15.5a5 5 0 0 1 0-7')}
      {P('M15.5 8.5a5 5 0 0 1 0 7')}
      {P('M5.6 18.4a9 9 0 0 1 0-12.8')}
      {P('M18.4 5.6a9 9 0 0 1 0 12.8')}
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      {P('m21 21-4.5-4.5')}
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      {P('M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4')}
    </>
  ),
  moon: P('M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'),
  plus: P('M12 5v14M5 12h14'),
  x: P('M18 6 6 18M6 6l12 12'),
  check: P('m4 12.5 5 5L20 6.5'),
  'chevron-down': P('m6 9 6 6 6-6'),
  'chevron-right': P('m9 6 6 6-6 6'),
  'chevron-left': P('m15 6-6 6 6 6'),
  'arrow-left': P('M19 12H5m6 7-7-7 7-7'),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      {P('M12 7v5l3.5 2')}
    </>
  ),
  tag: (
    <>
      {P('M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z')}
      <circle cx="7.5" cy="7.5" r="0.5" />
    </>
  ),
  alert: (
    <>
      {P('M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z')}
      {P('M12 9v4.5')}
      <circle cx="12" cy="17" r="0.5" />
    </>
  ),
  archive: (
    <>
      <rect x="2" y="3" width="20" height="5" rx="1" />
      {P('M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8')}
      {P('M10 12h4')}
    </>
  ),
  link: (
    <>
      {P('M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7')}
      {P('M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7')}
    </>
  ),
  external: (
    <>
      {P('M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6')}
      {P('M15 3h6v6')}
      {P('M10 14 21 3')}
    </>
  ),
  trash: (
    <>
      {P('M3 6h18')}
      {P('M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2')}
      {P('m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6')}
    </>
  ),
  pencil: P('M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z'),
  refresh: (
    <>
      {P('M21 12a9 9 0 1 1-2.6-6.4')}
      {P('M21 3v6h-6')}
    </>
  ),
  filter: P('M22 3H2l8 9.5V19l4 2v-8.5z'),
  eye: (
    <>
      {P('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z')}
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  printer: (
    <>
      {P('M6 9V3h12v6')}
      <rect x="6" y="14" width="12" height="7" rx="1" />
      {P('M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2')}
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      {P('M8 2v4M16 2v4M3 9.5h18')}
    </>
  ),
  activity: P('M22 12h-4l-3 9L9 3l-3 9H2'),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      {P('M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5')}
      {P('M3 12c0 1.7 4 3 9 3s9-1.3 9-3')}
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      {P('M3 12h18')}
      {P('M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z')}
    </>
  ),
  command: P(
    'M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z',
  ),
  dots: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  zap: P('M13 2 3 14h8l-1 8 11-13h-9z'),
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      {P('m8.5 12.5 2.5 2.5 5-6')}
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      {P('M12 11v5')}
      <circle cx="12" cy="8" r="0.5" />
    </>
  ),
  sort: (
    <>
      {P('m8 7 4-4 4 4')}
      {P('M12 3v18')}
      {P('m16 17-4 4-4-4')}
    </>
  ),
  minus: P('M5 12h14'),
} as const

export type IconName = keyof typeof ICONS

interface IconProps {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}

/** Inline stroke icon set (lucide-style geometry), themed via currentColor. */
export function Icon({ name, size = 16, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name] as ReactNode}
    </svg>
  )
}

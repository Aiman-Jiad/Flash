import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = (props: P) => ({
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, ...props,
})

export const HomeIcon = (p: P) => (
  <svg {...base(p)}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>
)
export const SearchIcon = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
)
export const PlusIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
)
export const ReelIcon = (p: P) => (
  <svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M3 7h4V3M17 3v4h4M3 17h4v4M17 21v-4h4" /><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" /></svg>
)
export const HeartIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1 4 2 .8-1 2-2 4-2 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z" /></svg>
)
export const HeartFilledIcon = (p: P) => (
  <svg {...base({ ...p, fill: 'currentColor', stroke: 'currentColor' })}><path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1 4 2 .8-1 2-2 4-2 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z" /></svg>
)
export const CommentIcon = (p: P) => (
  <svg {...base(p)}><path d="M21 11.5a8.38 8.38 0 0 1-9.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-4.7A8.5 8.5 0 1 1 21 11.5z" /></svg>
)
export const ShareIcon = (p: P) => (
  <svg {...base(p)}><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></svg>
)
export const BookmarkIcon = (p: P) => (
  <svg {...base(p)}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
)
export const BookmarkFilledIcon = (p: P) => (
  <svg {...base({ ...p, fill: 'currentColor', stroke: 'currentColor' })}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
)
export const MenuIcon = (p: P) => (
  <svg {...base(p)}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
)
export const MoreIcon = (p: P) => (
  <svg {...base(p)}><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" /></svg>
)
export const SettingsIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
)
export const BackIcon = (p: P) => (
  <svg {...base(p)}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
)
export const SunIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
)
export const MoonIcon = (p: P) => (
  <svg {...base(p)}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
)
export const CloseIcon = (p: P) => (
  <svg {...base(p)}><path d="M18 6L6 18M6 6l12 12" /></svg>
)
export const CheckIcon = (p: P) => (
  <svg {...base(p)}><path d="M20 6L9 17l-5-5" /></svg>
)
export const ChatIcon = (p: P) => (
  <svg {...base(p)}><path d="M21 11.5a8.38 8.38 0 0 1-9.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-4.7A8.5 8.5 0 1 1 21 11.5z" /></svg>
)
export const EditIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
)
export const LogoutIcon = (p: P) => (
  <svg {...base(p)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>
)
export const CameraIcon = (p: P) => (
  <svg {...base(p)}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
)
export const LinkIcon = (p: P) => (
  <svg {...base(p)}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
)
export const LocationIcon = (p: P) => (
  <svg {...base(p)}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
)
export const VerifiedIcon = (p: P) => (
  <svg {...base({ ...p, fill: 'currentColor', stroke: 'none' })}><path d="M12 2l2.4 1.8 3-.3 1 2.8 2.7 1.4-.8 2.9.8 2.9-2.7 1.4-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8-2.7-1.4.8-2.9-.8-2.9 2.7-1.4 1-2.8 3 .3L12 2z" /><path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" /></svg>
)

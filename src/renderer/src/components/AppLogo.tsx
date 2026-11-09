export default function AppLogo({ size = 22 }: { size?: number }) {
  return (
    <svg className="app-logo" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="var(--accent)" />
      <g stroke="rgba(255,255,255,0.92)" strokeWidth="1.4" strokeLinecap="round">
        <path d="M9.7 10.4 L6.4 7.4" />
        <path d="M14.3 10.4 L17.6 7.4" />
        <path d="M9.7 13.6 L6.4 16.6" />
        <path d="M14.3 13.6 L17.6 16.6" />
      </g>
      <circle cx="12" cy="12" r="3.1" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.5" />
      <circle cx="6" cy="7" r="1.5" fill="rgba(255,255,255,0.92)" />
      <circle cx="18" cy="7" r="1.5" fill="rgba(255,255,255,0.92)" />
      <circle cx="6" cy="17" r="1.5" fill="rgba(255,255,255,0.92)" />
      <circle cx="18" cy="17" r="1.5" fill="rgba(255,255,255,0.92)" />
    </svg>
  )
}

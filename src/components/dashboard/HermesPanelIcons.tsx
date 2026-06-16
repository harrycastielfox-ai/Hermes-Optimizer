import type { ReactNode } from "react";

type IconProps = { className?: string };

function BaseIcon({ children, className }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function HermesComputerIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <rect x="3.5" y="4.5" width="17" height="11" rx="1.3" />
      <path d="M9 19.5h6M12 15.5v4" />
    </BaseIcon>
  );
}

export function HermesWindowsIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path
        fill="currentColor"
        stroke="none"
        d="M3.5 5.2 10.7 4v7.2H3.5V5.2Zm8.2-1.35 8.8-1.45v8.8h-8.8V3.85ZM3.5 12.2h7.2V20l-7.2-1.15V12.2Zm8.2 0h8.8v9.4l-8.8-1.42V12.2Z"
      />
    </BaseIcon>
  );
}

export function HermesVersionIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <rect x="6" y="5" width="11" height="14" rx="1.6" />
      <path d="M8.5 8h6M8.5 11h6M8.5 14h3.5" />
      <path d="M4 8.5V6.8A3.8 3.8 0 0 1 7.8 3H15" />
      <path d="M20 15.5v1.7A3.8 3.8 0 0 1 16.2 21H9" />
    </BaseIcon>
  );
}

export function HermesArchitectureIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1" />
      <rect x="15" y="3.5" width="5.5" height="5.5" rx="1" />
      <rect x="3.5" y="15" width="5.5" height="5.5" rx="1" />
      <rect x="15" y="15" width="5.5" height="5.5" rx="1" />
      <path d="M9 6.25h6M6.25 9v6M17.75 9v6M9 17.75h6" />
    </BaseIcon>
  );
}

export function HermesClockIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2.2" />
    </BaseIcon>
  );
}

export function HermesCollectionIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.2 6.3" />
      <path d="M20.5 4.5v5h-5" />
      <path d="M12 8v4l2.6 1.8" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}

export function HermesCpuIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <rect x="7" y="7" width="10" height="10" rx="1.6" />
      <rect x="10" y="10" width="4" height="4" rx=".7" />
      <path d="M9 3.5v3M12 3.5v3M15 3.5v3M9 17.5v3M12 17.5v3M15 17.5v3M3.5 9h3M3.5 12h3M3.5 15h3M17.5 9h3M17.5 12h3M17.5 15h3" />
    </BaseIcon>
  );
}

export function HermesRamIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <rect x="3.5" y="7" width="17" height="8.5" rx="1.4" />
      <path d="M6.5 10h2.2M11 10h2.2M15.5 10h2.2M6 15.5v2M9 15.5v2M12 15.5v2M15 15.5v2M18 15.5v2" />
    </BaseIcon>
  );
}

export function HermesGpuIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <rect x="5" y="7" width="14" height="8.5" rx="1.5" />
      <circle cx="10" cy="11.25" r="1.9" />
      <circle cx="15" cy="11.25" r="1.9" />
      <path d="M5 9H3.5M5 15.5v3M9 15.5h6M19 9h1.5" />
    </BaseIcon>
  );
}

export function HermesDiskIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M6.5 5.5h11l2 12.5a1.8 1.8 0 0 1-1.8 2H6.3a1.8 1.8 0 0 1-1.8-2l2-12.5Z" />
      <path d="M5.4 15.5h13.2M9 18h3.5" />
      <circle cx="16" cy="18" r=".8" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}

export function HermesMotherboardIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="7" y="7" width="5" height="5" rx=".8" />
      <rect x="14.5" y="7" width="2.8" height="5" rx=".6" />
      <rect x="7" y="15" width="4" height="2.6" rx=".6" />
      <rect x="13.8" y="14.5" width="3.8" height="3.2" rx=".6" />
      <path d="M12 9.5h2.5M9.5 12v3M11 16.3h2.8M16 12v2.5M8 4V2.5M12 4V2.5M16 4V2.5M8 21.5V20M12 21.5V20M16 21.5V20M2.5 8H4M2.5 12H4M2.5 16H4M20 8h1.5M20 12h1.5M20 16h1.5" />
    </BaseIcon>
  );
}

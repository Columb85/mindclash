'use client';

/**
 * Professional Mantle-themed icons
 * Minimalist, clean design matching Mantle brand aesthetic
 */

interface IconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

// AI Brain Icon - for AI agents
export const AIBrainIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path
      d="M12 3C7.58172 3 4 6.58172 4 11C4 13.5 5 15.5 6.5 17C7 17.5 7.5 18 8 18.5C8.5 19 9 19.5 9.5 20C10 20.5 10.5 21 11 21H13C13.5 21 14 20.5 14.5 20C15 19.5 15.5 19 16 18.5C16.5 18 17 17.5 17.5 17C19 15.5 20 13.5 20 11C20 6.58172 16.4183 3 12 3Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.5 10C9.5 10 10 11 12 11C14 11 14.5 10 14.5 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="9" cy="9" r="1" fill="currentColor" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
    <path
      d="M12 13V16M10 15H14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// Trading Chart Icon
export const TradingIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path
      d="M3 3V21H21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 14L10 11L13 14L18 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18 9H15M18 9V12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Lightning Bolt - for quick actions
export const BoltIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path
      d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Trophy Icon - for achievements
export const TrophyIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path
      d="M6 9H4.5C3.67157 9 3 8.32843 3 7.5V6C3 5.17157 3.67157 4.5 4.5 4.5H6M18 9H19.5C20.3284 9 21 8.32843 21 7.5V6C21 5.17157 20.3284 4.5 19.5 4.5H18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M6 4.5H18V12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12V4.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 18V21M9 21H15"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Target Icon - for goals
export const TargetIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

// Users Icon - for community
export const UsersIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    <path
      d="M2 21V19C2 16.7909 3.79086 15 6 15H12C14.2091 15 16 16.7909 16 19V21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16 11C17.6569 11 19 9.65685 19 8C19 6.34315 17.6569 5 16 5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M19 15C20.6569 15 22 16.3431 22 18V21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// Sparkle Icon - for new features
export const SparkleIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path
      d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M19 3L19.5 5L21.5 5.5L19.5 6L19 8L18.5 6L16.5 5.5L18.5 5L19 3Z"
      fill="currentColor"
    />
    <path
      d="M19 16L19.5 18L21.5 18.5L19.5 19L19 21L18.5 19L16.5 18.5L18.5 18L19 16Z"
      fill="currentColor"
    />
  </svg>
);

// Arrow Right - for navigation
export const ArrowRightIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path
      d="M5 12H19M19 12L12 5M19 12L12 19"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Check Circle - for success
export const CheckCircleIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path
      d="M8 12L11 15L16 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Clock Icon - for time
export const ClockIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 6V12L16 14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Trending Up - for growth
export const TrendUpIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path
      d="M22 7L13.5 15.5L8.5 10.5L2 17"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 7H22V13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Trending Down - for decline
export const TrendDownIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path
      d="M22 17L13.5 8.5L8.5 13.5L2 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 17H22V11"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Activity Icon - for activity
export const ActivityIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path
      d="M22 12H18L15 21L9 3L6 12H2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Coins Icon - for tokens
export const CoinsIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
    <path
      d="M15 9C17.7614 9 20 11.2386 20 14C20 16.7614 17.7614 19 15 19C12.2386 19 10 16.7614 10 14"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

// Crown Icon - for leaders
export const CrownIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path
      d="M2 18H22V20H2V18Z"
      fill="currentColor"
    />
    <path
      d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Home Icon
export const HomeIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path
      d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 22V12H15V22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// User Icon
export const UserIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <circle cx="12" cy="8" r="5" stroke="currentColor" strokeWidth="2" />
    <path
      d="M3 21C3 17.134 7.02944 14 12 14C16.9706 14 21 17.134 21 21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// Globe Icon - for languages
export const GlobeIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path
      d="M2 12H22M12 2C14.5 4.5 16 8 16 12C16 16 14.5 19.5 12 22M12 2C9.5 4.5 8 8 8 12C8 16 9.5 19.5 12 22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// Sword Icon - for battles
export const SwordIcon = ({ className, size = 24, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path
      d="M14.5 6.5L17.5 3.5L20.5 6.5L17.5 9.5L14.5 6.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M4 20L9 15M14.5 6.5L9 12L6 15L4 20L9 18L12 15L17.5 9.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

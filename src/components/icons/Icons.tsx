type IconProps = {
    width?: string | number;
    height?: string | number;
    className?: string;
    style?: React.CSSProperties;
};

const defaults = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

export const VolumeIcon = ({ width = 16, height = 16, className, style }: IconProps) => (
    <svg width={width} height={height} viewBox="0 0 24 24" {...defaults} className={className} style={style} aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
);

export const MuteIcon = ({ width = 16, height = 16, className, style }: IconProps) => (
    <svg width={width} height={height} viewBox="0 0 24 24" {...defaults} className={className} style={style} aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
);

export const LightningIcon = ({ width = 16, height = 16, className, style }: IconProps) => (
    <svg width={width} height={height} viewBox="0 0 24 24" {...defaults} className={className} style={style} aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

export const WarningIcon = ({ width = 16, height = 16, className, style }: IconProps) => (
    <svg width={width} height={height} viewBox="0 0 24 24" {...defaults} className={className} style={style} aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

export const WrenchIcon = ({ width = 16, height = 16, className, style }: IconProps) => (
    <svg width={width} height={height} viewBox="0 0 24 24" {...defaults} className={className} style={style} aria-hidden="true">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
);

export const GearIcon = ({ width = 16, height = 16, className, style }: IconProps) => (
    <svg width={width} height={height} viewBox="0 0 24 24" {...defaults} className={className} style={style} aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

export const SearchIcon = ({ width = 16, height = 16, className, style }: IconProps) => (
    <svg width={width} height={height} viewBox="0 0 24 24" {...defaults} className={className} style={style} aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

export const BookmarkIcon = ({ width = 16, height = 16, className, style }: IconProps) => (
    <svg width={width} height={height} viewBox="0 0 24 24" {...defaults} className={className} style={style} aria-hidden="true">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
);

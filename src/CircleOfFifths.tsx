import {
  type LayoutMode,
  labelsForMode,
  positionToPitchClass,
  signedFifthsBetweenPitchClasses,
} from './notes';
import { type Theme, contrastText } from './themes';

type Props = {
  activePosition: number | null;
  cents: number | null;
  mode: LayoutMode;
  theme: Theme;
  size?: number;
};

const SECTORS = 12;

export function CircleOfFifths({ activePosition, cents, mode, theme, size = 520 }: Props) {
  const labels = labelsForMode(mode);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.46;
  const innerR = size * 0.30;
  const labelR = (outerR + innerR) / 2;
  const fifthsLabelR = outerR + size * 0.025;

  const sweep = (2 * Math.PI) / SECTORS;
  const startAngle = -Math.PI / 2 - sweep / 2;

  const activePc =
    activePosition === null ? null : positionToPitchClass(activePosition, mode);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      role="img"
      aria-label={`Circle of ${mode === 'fifths' ? 'fifths' : 'chromatic notes'}`}
    >
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={theme.surface} />
          <stop offset="100%" stopColor={theme.bg} />
        </radialGradient>
        <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={size * 0.006} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx={cx} cy={cy} r={size * 0.495} fill="url(#bgGrad)" />

      {labels.map((label, i) => {
        const a0 = startAngle + i * sweep;
        const a1 = a0 + sweep;
        const path = sectorPath(cx, cy, innerR, outerR, a0, a1);

        const positionPc = positionToPitchClass(i, mode);
        const distance =
          activePc === null ? null : signedFifthsBetweenPitchClasses(activePc, positionPc);
        const isActive = distance === 0;
        const noteColor = theme.noteColors[positionPc];
        const emphasizeFifth = shouldEmphasizeFifth(distance, mode);

        const { fill, fillOpacity } = sectorFill({
          isActive,
          emphasizeFifth,
          distance,
          mode,
          noteColor,
          theme,
        });
        const stroke = isActive
          ? theme.activeStroke
          : emphasizeFifth
            ? noteColor
            : theme.sectorIdleStroke;
        const strokeWidth = isActive ? 3 : emphasizeFifth ? 2 : 1;

        const labelAngle = (a0 + a1) / 2;
        const lx = cx + Math.cos(labelAngle) * labelR;
        const ly = cy + Math.sin(labelAngle) * labelR;

        const fx = cx + Math.cos(labelAngle) * fifthsLabelR;
        const fy = cy + Math.sin(labelAngle) * fifthsLabelR;

        const showDistance = distance !== null && distance !== 0;
        const labelFill = isActive ? contrastText(noteColor) : theme.text;

        return (
          <g key={i}>
            <path
              d={path}
              fill={fill}
              fillOpacity={fillOpacity}
              stroke={stroke}
              strokeWidth={strokeWidth}
              style={{
                transition:
                  'fill 180ms ease-out, fill-opacity 180ms ease-out, stroke 180ms ease-out, stroke-width 180ms ease-out',
              }}
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.045}
              fontWeight={isActive ? 800 : 600}
              fill={labelFill}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {label}
            </text>
            {showDistance && (
              <text
                x={fx}
                y={fy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.025}
                fill={emphasizeFifth ? noteColor : theme.textMuted}
                fontWeight={emphasizeFifth ? 700 : 400}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {distance > 0 ? `+${distance}` : distance}
              </text>
            )}
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r={innerR} fill={theme.bg} stroke={theme.border} />

      {activePosition !== null && cents !== null && (() => {
        const sectorCenter = startAngle + activePosition * sweep + sweep / 2;
        const angle = sectorCenter + (cents / 100) * sweep;
        const r1 = innerR;
        const r2 = outerR + size * 0.012;
        const x1 = cx + Math.cos(angle) * r1;
        const y1 = cy + Math.sin(angle) * r1;
        const x2 = cx + Math.cos(angle) * r2;
        const y2 = cy + Math.sin(angle) * r2;
        return (
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={theme.needle}
            strokeWidth={size * 0.006}
            strokeLinecap="round"
            filter="url(#needleGlow)"
          />
        );
      })()}
    </svg>
  );
}

function shouldEmphasizeFifth(distance: number | null, mode: LayoutMode): boolean {
  return mode === 'chromatic' && distance !== null && Math.abs(distance) === 1;
}

function sectorPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  a0: number,
  a1: number,
): string {
  const x0o = cx + Math.cos(a0) * outerR;
  const y0o = cy + Math.sin(a0) * outerR;
  const x1o = cx + Math.cos(a1) * outerR;
  const y1o = cy + Math.sin(a1) * outerR;
  const x0i = cx + Math.cos(a0) * innerR;
  const y0i = cy + Math.sin(a0) * innerR;
  const x1i = cx + Math.cos(a1) * innerR;
  const y1i = cy + Math.sin(a1) * innerR;
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${x0o} ${y0o}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x1o} ${y1o}`,
    `L ${x1i} ${y1i}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x0i} ${y0i}`,
    'Z',
  ].join(' ');
}

function sectorFill(opts: {
  isActive: boolean;
  emphasizeFifth: boolean;
  distance: number | null;
  mode: LayoutMode;
  noteColor: string;
  theme: Theme;
}): { fill: string; fillOpacity: number } {
  const { isActive, emphasizeFifth, distance, mode, noteColor, theme } = opts;
  if (distance === null) return { fill: theme.sectorIdle, fillOpacity: 1 };
  if (isActive) return { fill: noteColor, fillOpacity: 1 };
  if (emphasizeFifth) return { fill: noteColor, fillOpacity: 0.4 };
  if (mode === 'fifths') {
    const d = Math.abs(distance);
    const t = 1 - (d - 1) / 5;
    return { fill: noteColor, fillOpacity: 0.08 + t * 0.22 };
  }
  return { fill: theme.sectorIdle, fillOpacity: 1 };
}

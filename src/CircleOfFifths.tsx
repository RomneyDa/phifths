import { CIRCLE_LABELS, signedFifthsDistance } from './notes';

type Props = {
  /** Index 0..11 on the circle of fifths, or null if no pitch detected. */
  activePosition: number | null;
  size?: number;
};

const SECTORS = 12;

export function CircleOfFifths({ activePosition, size = 520 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.46;
  const innerR = size * 0.18;
  const labelR = (outerR + innerR) / 2;
  const fifthsLabelR = outerR + size * 0.025;

  const sweep = (2 * Math.PI) / SECTORS;
  // Rotate so position 0 (C) is at the top, sectors centered on each label.
  const startAngle = -Math.PI / 2 - sweep / 2;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      role="img"
      aria-label="Circle of fifths"
    >
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a1d2e" />
          <stop offset="100%" stopColor="#0a0b14" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={outerR + size * 0.05} fill="url(#bgGrad)" />

      {CIRCLE_LABELS.map((label, i) => {
        const a0 = startAngle + i * sweep;
        const a1 = a0 + sweep;
        const path = sectorPath(cx, cy, innerR, outerR, a0, a1);

        const distance =
          activePosition === null ? null : signedFifthsDistance(activePosition, i);
        const isActive = distance === 0;

        const fill = sectorFill(distance, isActive);
        const stroke = isActive ? '#fff' : '#22263a';

        const labelAngle = (a0 + a1) / 2;
        const lx = cx + Math.cos(labelAngle) * labelR;
        const ly = cy + Math.sin(labelAngle) * labelR;

        const fx = cx + Math.cos(labelAngle) * fifthsLabelR;
        const fy = cy + Math.sin(labelAngle) * fifthsLabelR;

        return (
          <g key={label}>
            <path
              d={path}
              fill={fill}
              stroke={stroke}
              strokeWidth={isActive ? 3 : 1}
              style={{ transition: 'fill 120ms linear, stroke 120ms linear' }}
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.045}
              fontWeight={isActive ? 800 : 600}
              fill={isActive ? '#0a0b14' : '#e6e8ff'}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {label}
            </text>
            {distance !== null && distance !== 0 && (
              <text
                x={fx}
                y={fy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.025}
                fill="#9aa0c8"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {distance > 0 ? `+${distance}` : distance}
              </text>
            )}
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r={innerR} fill="#0a0b14" stroke="#22263a" />
      <text
        x={cx}
        y={cy - size * 0.015}
        textAnchor="middle"
        fontSize={size * 0.038}
        fill="#9aa0c8"
        fontWeight={500}
      >
        circle of
      </text>
      <text
        x={cx}
        y={cy + size * 0.03}
        textAnchor="middle"
        fontSize={size * 0.05}
        fill="#e6e8ff"
        fontWeight={700}
      >
        fifths
      </text>
    </svg>
  );
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

function sectorFill(distance: number | null, isActive: boolean): string {
  if (distance === null) return '#15182a';
  if (isActive) return '#7aa2ff';
  // Closer to the detected note in fifths = warmer/brighter.
  // |distance| ranges 1..6.
  const d = Math.abs(distance);
  const t = 1 - (d - 1) / 5; // 1 (closest) → 0 (tritone)
  const hue = 220 - t * 40; // 220 (cool blue) → 180 (teal-ish)
  const sat = 30 + t * 30;
  const light = 18 + t * 22;
  return `hsl(${hue} ${sat}% ${light}%)`;
}

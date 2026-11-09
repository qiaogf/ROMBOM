// Shared helpers for cabinet diagram components (CabinetDiagram + DistributionDiagram).
// Keeps the duplicated label-layout logic and tiny SVG primitives in one place.

export interface BasePart {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BaseLabelItem {
  part: string;
}

export interface LabelLayoutConfig {
  cabTop: number;
  cabBottom: number;
  midY: number;
  labelStep: number;
  labelColW: number;
  labelGapTop: number;
  labelGapBottom: number;
}

/**
 * Split labels into upper/lower halves (by part vertical center) and lay them
 * out in two columns above/below the cabinet. Generic over the concrete
 * Part/LabelItem types so both diagrams keep their own Kind unions.
 */
export function layoutLabels<
  P extends BasePart,
  L extends BaseLabelItem,
>(cab: { x: number; parts: P[]; labels: L[] }, cfg: LabelLayoutConfig): Array<{ label: L; part: P; x: number; y: number; above: boolean }> {
  const items = cab.labels
    .map((label) => ({ label, part: cab.parts.find((p) => p.key === label.part) }))
    .filter((it): it is { label: L; part: P } => Boolean(it.part));
  const upper = items.filter((it) => it.part.y + it.part.h / 2 < cfg.midY);
  const lower = items.filter((it) => it.part.y + it.part.h / 2 >= cfg.midY);
  const place = (group: typeof items, above: boolean) => {
    const leftCount = Math.ceil(group.length / 2);
    return group.map((it, i) => {
      const col = i < leftCount ? 0 : 1;
      const row = i < leftCount ? i : i - leftCount;
      const y = above
        ? cfg.cabTop - cfg.labelGapTop - ((col === 0 ? leftCount : group.length - leftCount) - 1 - row) * cfg.labelStep
        : cfg.cabBottom + cfg.labelGapBottom + row * cfg.labelStep;
      return { ...it, x: cab.x + 2 + col * cfg.labelColW, y, above };
    });
  };
  return [...place(upper, true), ...place(lower, false)];
}

export function Led({ cx, cy, r = 1.2, color = "#22c55e" }: { cx: number; cy: number; r?: number; color?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r * 2} fill={color} opacity={0.16} />
      <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.95} />
      <circle cx={cx - r * 0.28} cy={cy - r * 0.3} r={r * 0.34} fill="#ffffff" opacity={0.8} />
    </g>
  );
}

export function Screw({
  cx,
  cy,
  r = 1.05,
  gradientId = "screw",
}: {
  cx: number;
  cy: number;
  r?: number;
  gradientId?: string;
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${gradientId})`} stroke="#64748b" strokeWidth={0.22} />
      <line
        x1={cx - r * 0.55}
        y1={cy + r * 0.2}
        x2={cx + r * 0.55}
        y2={cy - r * 0.2}
        stroke="#475569"
        strokeWidth={0.32}
        strokeLinecap="round"
      />
    </g>
  );
}

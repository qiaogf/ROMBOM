"use client";

import { useState } from "react";
import { layoutLabels, Led, Screw, type LabelLayoutConfig } from "./cabinet-shared";

type Kind =
  | "busbar"
  | "acb"
  | "ct"
  | "meter"
  | "spd"
  | "button"
  | "lamp"
  | "selector"
  | "live"
  | "fuse"
  | "terminal"
  | "module"
  | "cableentry"
  | "pebar"
  | "testtb"
  | "junction"
  | "controller"
  | "contactor"
  | "reactor"
  | "capacitor"
  | "fan"
  | "power"
  | "drawer"
  | "fixed";

interface Part {
  key: string;
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LabelItem {
  part: string;
  text: string;
}

interface CabinetSpec {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  accent: string;
  parts: Part[];
  labels: LabelItem[];
}

const CAB_TOP = 396;
const CAB_W = 256;
const CAB_H = 620;
const CAB_BOTTOM = CAB_TOP + CAB_H;
const MID_Y = CAB_TOP + CAB_H / 2;
const LABEL_STEP = 20;
const LABEL_COL_W = 128;
const LABEL_GAP_TOP = 30;
const LABEL_GAP_BOTTOM = 20;
const PILL_H = 12;
const VIEW_TOP = 120;
const VIEW_H = 1010;
// 柜外引线的水平走廊：与柜体可见外轮廓保持固定间距（顶部顶板外凸 4px、底部槽钢 6.5px）
const CORRIDOR_TOP = CAB_TOP - 12;
const CORRIDOR_BOTTOM = CAB_BOTTOM + 12;

const LABEL_CFG: LabelLayoutConfig = {
  cabTop: CAB_TOP,
  cabBottom: CAB_BOTTOM,
  midY: MID_Y,
  labelStep: LABEL_STEP,
  labelColW: LABEL_COL_W,
  labelGapTop: LABEL_GAP_TOP,
  labelGapBottom: LABEL_GAP_BOTTOM,
};

interface LabelSlot {
  label: LabelItem;
  part: Part;
  x: number;
  y: number;
  above: boolean;
}

const HEADER_TINT: Record<string, string> = {
  "#0f766e": "#ccfbf1",
  "#4338ca": "#e0e7ff",
  "#b91c1c": "#fee2e2",
  "#b45309": "#fef3c7",
};

const HEADER_TEXT: Record<string, string> = {
  "#0f766e": "#115e59",
  "#4338ca": "#3730a3",
  "#b91c1c": "#991b1b",
  "#b45309": "#92400e",
};

const CABINETS: CabinetSpec[] = [
  {
    id: "incoming",
    title: "Incoming Cabinet",
    subtitle: "2000 × 800 × 600 · IP40 · Form 3b",
    x: 24,
    accent: "#0f766e",
    parts: [
      { key: "inc-bus", kind: "busbar", x: 38, y: 437, w: 228, h: 18 },
      { key: "inc-fan", kind: "fan", x: 38, y: 462, w: 40, h: 44 },
      { key: "inc-btn", kind: "button", x: 86, y: 468, w: 64, h: 32 },
      { key: "inc-lamp", kind: "lamp", x: 156, y: 468, w: 48, h: 32 },
      { key: "inc-sel", kind: "selector", x: 210, y: 467, w: 54, h: 34 },
      { key: "inc-ct1", kind: "ct", x: 111.3, y: 561, w: 36, h: 54 },
      { key: "inc-ct2", kind: "ct", x: 164.6, y: 561, w: 36, h: 54 },
      { key: "inc-acb", kind: "acb", x: 38, y: 546, w: 56, h: 84 },
      { key: "inc-psu", kind: "power", x: 217.7, y: 568, w: 48, h: 40 },
      { key: "inc-spd", kind: "spd", x: 74, y: 674, w: 54, h: 44 },
      { key: "inc-meter", kind: "meter", x: 140, y: 670, w: 52, h: 52 },
      { key: "inc-live", kind: "live", x: 204, y: 681, w: 62, h: 30 },
      { key: "inc-fuse", kind: "fuse", x: 38, y: 679, w: 24, h: 34 },
      { key: "inc-tb", kind: "terminal", x: 38, y: 756, w: 228, h: 30 },
      { key: "inc-petb", kind: "terminal", x: 38, y: 798, w: 228, h: 28 },
      { key: "inc-cable", kind: "cableentry", x: 38, y: 846, w: 228, h: 86 },
      { key: "inc-pe", kind: "pebar", x: 38, y: 948, w: 228, h: 10 },
    ],
    labels: [
      { part: "inc-bus", text: "Main Copper Busbar" },
      { part: "inc-acb", text: "ACB Main Breaker" },
      { part: "inc-ct1", text: "Current Transformer" },
      { part: "inc-meter", text: "Multi-function Meter" },
      { part: "inc-spd", text: "Surge Protective Device" },
      { part: "inc-fan", text: "Cooling Fan" },
      { part: "inc-psu", text: "24V Power Supply" },
      { part: "inc-btn", text: "Close / Open Button" },
      { part: "inc-lamp", text: "Status Indicator Light" },
      { part: "inc-sel", text: "Local / Remote Switch" },
      { part: "inc-live", text: "Live Display Device" },
      { part: "inc-fuse", text: "Secondary Fuse" },
      { part: "inc-tb", text: "Secondary Terminals" },
      { part: "inc-petb", text: "PE Terminal Block" },
      { part: "inc-cable", text: "Transformer Cable" },
      { part: "inc-pe", text: "PE Grounding Busbar" },
    ],
  },
  {
    id: "metering",
    title: "Metering Cabinet",
    subtitle: "2000 × 800 × 600 · IP40 · Sealed",
    x: 296,
    accent: "#4338ca",
    parts: [
      { key: "mt-bus", kind: "busbar", x: 310, y: 437, w: 228, h: 18 },
      { key: "mt-fan", kind: "fan", x: 310, y: 473, w: 44, h: 38 },
      { key: "mt-ct1", kind: "ct", x: 402, y: 462, w: 44, h: 60 },
      { key: "mt-ct2", kind: "ct", x: 494, y: 462, w: 44, h: 60 },
      { key: "mt-fuse", kind: "fuse", x: 310, y: 587, w: 30, h: 38 },
      { key: "mt-psu", kind: "power", x: 378, y: 590, w: 48, h: 32 },
      { key: "mt-meter", kind: "meter", x: 464, y: 567, w: 74, h: 78 },
      { key: "mt-test", kind: "testtb", x: 310, y: 690, w: 100, h: 34 },
      { key: "mt-box", kind: "junction", x: 452, y: 690, w: 86, h: 34 },
      { key: "mt-tb", kind: "terminal", x: 310, y: 756, w: 228, h: 30 },
      { key: "mt-petb", kind: "terminal", x: 310, y: 798, w: 108, h: 28 },
      { key: "mt-tb2", kind: "terminal", x: 426, y: 798, w: 112, h: 28 },
      { key: "mt-cable", kind: "cableentry", x: 310, y: 846, w: 228, h: 86 },
      { key: "mt-pe", kind: "pebar", x: 310, y: 948, w: 228, h: 10 },
    ],
    labels: [
      { part: "mt-bus", text: "Through Copper Busbar" },
      { part: "mt-ct1", text: "Metering CT 0.2S" },
      { part: "mt-meter", text: "3P4W Energy Meter" },
      { part: "mt-test", text: "Metering Test Block" },
      { part: "mt-box", text: "Anti-open Terminal Box" },
      { part: "mt-fuse", text: "Secondary Fuse" },
      { part: "mt-fan", text: "Cooling Fan" },
      { part: "mt-psu", text: "24V Power Supply" },
      { part: "mt-tb", text: "Secondary Terminals" },
      { part: "mt-petb", text: "PE Terminal Block" },
      { part: "mt-pe", text: "PE Grounding Busbar" },
    ],
  },
  {
    id: "compensation",
    title: "PF Compensation Cabinet",
    subtitle: "2000 × 800 × 600 · IP40 · 4 × 60 kvar",
    x: 568,
    accent: "#b91c1c",
    parts: [
      { key: "cp-bus", kind: "busbar", x: 582, y: 437, w: 228, h: 18 },
      { key: "cp-fan", kind: "fan", x: 582, y: 462, w: 40, h: 44 },
      { key: "cp-ind", kind: "lamp", x: 651, y: 468, w: 50, h: 32 },
      { key: "cp-ctrl", kind: "controller", x: 730, y: 466, w: 80, h: 46 },
      { key: "cp-meter", kind: "meter", x: 582, y: 534, w: 42, h: 44 },
      { key: "cp-ct", kind: "ct", x: 680, y: 532, w: 38, h: 48 },
      { key: "cp-psu", kind: "power", x: 774, y: 538, w: 36, h: 36 },
      { key: "cp-fuse1", kind: "fuse", x: 582, y: 610, w: 22, h: 36 },
      { key: "cp-cont1", kind: "contactor", x: 628.7, y: 604, w: 44, h: 48 },
      { key: "cp-reactor1", kind: "reactor", x: 697.3, y: 607, w: 38, h: 42 },
      { key: "cp-cap1", kind: "capacitor", x: 760, y: 595, w: 50, h: 66 },
      { key: "cp-fuse2", kind: "fuse", x: 582, y: 686, w: 22, h: 36 },
      { key: "cp-cont2", kind: "contactor", x: 628.7, y: 680, w: 44, h: 48 },
      { key: "cp-reactor2", kind: "reactor", x: 697.3, y: 683, w: 38, h: 42 },
      { key: "cp-cap2", kind: "capacitor", x: 760, y: 671, w: 50, h: 66 },
      { key: "cp-fuse3", kind: "fuse", x: 582, y: 762, w: 22, h: 36 },
      { key: "cp-cont3", kind: "contactor", x: 628.7, y: 756, w: 44, h: 48 },
      { key: "cp-reactor3", kind: "reactor", x: 697.3, y: 759, w: 38, h: 42 },
      { key: "cp-cap3", kind: "capacitor", x: 760, y: 747, w: 50, h: 66 },
      { key: "cp-fuse4", kind: "fuse", x: 582, y: 838, w: 22, h: 36 },
      { key: "cp-cont4", kind: "contactor", x: 628.7, y: 832, w: 44, h: 48 },
      { key: "cp-reactor4", kind: "reactor", x: 697.3, y: 835, w: 38, h: 42 },
      { key: "cp-cap4", kind: "capacitor", x: 760, y: 823, w: 50, h: 66 },
      { key: "cp-tb", kind: "terminal", x: 582, y: 902, w: 228, h: 30 },
      { key: "cp-pe", kind: "pebar", x: 582, y: 948, w: 228, h: 10 },
    ],
    labels: [
      { part: "cp-bus", text: "Main Copper Busbar" },
      { part: "cp-ctrl", text: "PF Controller" },
      { part: "cp-meter", text: "Power Meter" },
      { part: "cp-psu", text: "24V Power Supply" },
      { part: "cp-ct", text: "Sampling CT" },
      { part: "cp-fuse1", text: "Capacitor Fuse" },
      { part: "cp-cont1", text: "Capacitor Contactor" },
      { part: "cp-reactor1", text: "Series Reactor 7%" },
      { part: "cp-cap1", text: "Capacitor 60 kvar" },
      { part: "cp-ind", text: "Cap ON Indicator" },
      { part: "cp-tb", text: "Secondary Terminals" },
      { part: "cp-fan", text: "Cooling Fan & Thermostat" },
      { part: "cp-pe", text: "PE Grounding Busbar" },
    ],
  },
  {
    id: "outgoing",
    title: "Mixed Outgoing Cabinet",
    subtitle: "Drawer (left) + Fixed (right) · 4 + 4",
    x: 840,
    accent: "#b45309",
    parts: [
      { key: "og-bus", kind: "busbar", x: 854, y: 437, w: 228, h: 18 },
      { key: "og-fan", kind: "fan", x: 854, y: 462, w: 48, h: 40 },
      { key: "og-psu", kind: "power", x: 916, y: 466, w: 44, h: 34 },
      { key: "og-d1", kind: "drawer", x: 854, y: 516, w: 104, h: 86 },
      { key: "og-d2", kind: "drawer", x: 854, y: 612, w: 104, h: 86 },
      { key: "og-d3", kind: "drawer", x: 854, y: 708, w: 104, h: 86 },
      { key: "og-d4", kind: "drawer", x: 854, y: 804, w: 104, h: 86 },
      { key: "og-f1", kind: "fixed", x: 974, y: 516, w: 108, h: 86 },
      { key: "og-f2", kind: "fixed", x: 974, y: 612, w: 108, h: 86 },
      { key: "og-f3", kind: "fixed", x: 974, y: 708, w: 108, h: 86 },
      { key: "og-f4", kind: "fixed", x: 974, y: 804, w: 108, h: 86 },
      { key: "og-tb", kind: "terminal", x: 854, y: 902, w: 228, h: 30 },
      { key: "og-pe", kind: "pebar", x: 854, y: 948, w: 228, h: 10 },
    ],
    labels: [
      { part: "og-bus", text: "Main Busbar & PE" },
      { part: "og-fan", text: "Cooling Fan" },
      { part: "og-psu", text: "24V Power Supply" },
      { part: "og-d1", text: "Drawer MCCB + Contactor" },
      { part: "og-f1", text: "Fixed MCCB / MCB" },
      { part: "og-d2", text: "Drawer CT + Thermal Relay" },
      { part: "og-f2", text: "CT + Contactor (Fixed)" },
      { part: "og-d3", text: "Drawer Handle + Interlock" },
      { part: "og-f3", text: "Live Indicator + Fuse" },
      { part: "og-d4", text: "Primary / Secondary Plug" },
      { part: "og-f4", text: "Branch MCCB / MCB" },
      { part: "og-tb", text: "N / PE Terminal Block" },
      { part: "og-pe", text: "PE Grounding Busbar" },
    ],
  },
];

// 同层元器件上下居中对齐：中心高度接近的视为同一层，统一对齐到层中心
const ROW_TOLERANCE = 26;
for (const cab of CABINETS) {
  const sorted = [...cab.parts].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const groups: Part[][] = [];
  for (const p of sorted) {
    const g = groups[groups.length - 1];
    const c = p.y + p.h / 2;
    if (g) {
      const gc = g.reduce((s, q) => s + q.y + q.h / 2, 0) / g.length;
      if (Math.abs(c - gc) <= ROW_TOLERANCE) {
        g.push(p);
        continue;
      }
    }
    groups.push([p]);
  }
  for (const g of groups) {
    if (g.length < 2) continue;
    const center = g.reduce((s, q) => s + q.y + q.h / 2, 0) / g.length;
    for (const p of g) p.y = Math.round((center - p.h / 2) * 10) / 10;
  }
}

function PartShade({ x, y, w, h, rx = 1.6 }: { x: number; y: number; w: number; h: number; rx?: number }) {
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="url(#pside)" />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="url(#pshade)" />
      <rect x={x + rx * 0.7} y={y + h - 1.15} width={w - rx * 1.4} height={0.6} rx={0.3} fill="#0f172a" opacity={0.16} />
    </g>
  );
}

// 元器件实物贴图（public/images/components/*.webp），SVG 布局坐标保持不变
const PART_IMAGE: Record<Kind, string> = {
  busbar: "copper-busbar",
  acb: "acb-breaker",
  ct: "current-transformer",
  meter: "panel-meter",
  spd: "spd",
  button: "push-buttons",
  lamp: "pilot-lamps",
  selector: "selector-switch",
  live: "live-display",
  fuse: "fuse-holder",
  terminal: "terminal-block",
  module: "din-module",
  cableentry: "cable-entry",
  pebar: "pe-bar",
  testtb: "test-block",
  junction: "junction-box",
  controller: "pf-controller",
  contactor: "contactor",
  reactor: "reactor",
  capacitor: "capacitor",
  fan: "fan-120",
  power: "power-lrs",
  drawer: "drawer-unit",
  fixed: "fixed-unit",
};

// 各元器件实物图的真实宽高比（用于判断是否裁切）
const KIND_RATIO: Partial<Record<Kind, number>> = {
  busbar: 1.78, acb: 0.75, ct: 1, meter: 1, spd: 0.75,
  button: 1.33, lamp: 1.33, selector: 1, live: 1.33, fuse: 0.75,
  terminal: 1.78, module: 1.33, cableentry: 1.78, pebar: 1.78,
  testtb: 1.33, junction: 1, controller: 1, contactor: 0.75,
  reactor: 0.75, capacitor: 0.75, fan: 1, power: 0.75,
  drawer: 1.33, fixed: 1.33,
};

// 实物图留白较多的元器件，放大裁切让实物占满画面
const KIND_ZOOM: Partial<Record<Kind, number>> = {
  power: 1.45, meter: 1.3, acb: 1.3, spd: 1.25, fuse: 1.25,
  contactor: 1.25, reactor: 1.3, capacitor: 1.25, controller: 1.3,
  junction: 1.2, ct: 1.15, fan: 1.15, selector: 1.2,
};

// 实物照片渲染：背板色底 + 照片（盒子比例与产品真实比例偏差大时完整显示，否则铺满）+ 细边框 + 投影
function PhotoShape({ part, src }: { part: Part; src: string }) {
  const { x, y, w, h, kind } = part;
  const n = w / h > 2.6 ? Math.max(2, Math.round(w / (h * 1.6))) : 1;
  const sw = w / n;
  const boxRatio = w / h;
  const imgRatio = KIND_RATIO[kind] ?? boxRatio;
  const deviate = Math.abs(boxRatio - imgRatio) / imgRatio;
  const useMeet = n === 1 && deviate > 0.32;
  // meet 模式下：把绘制框收窄到贴合产品真实比例并居中，避免大白框
  const fw = useMeet ? Math.min(w, h * imgRatio) : sw;
  const fh = useMeet ? fw / imgRatio : h;
  const fx = useMeet ? x + (w - fw) / 2 : x;
  const fy = useMeet ? y + (h - fh) / 2 : y;
  const zoom = useMeet ? (KIND_ZOOM[kind] ?? 1) : 1;
  const iw = fw * zoom;
  const ih = fh * zoom;
  const ix = fx + (fw - iw) / 2;
  const iy = fy + (fh - ih) / 2;
  return (
    <g filter="url(#psoft)">
      <defs>
        <clipPath id={`clip-${part.key}`}>
          <rect x={fx} y={fy} width={fw} height={fh} rx={1.6} />
        </clipPath>
      </defs>
      {useMeet ? (
        <image
          href={src}
          x={ix}
          y={iy}
          width={iw}
          height={ih}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#clip-${part.key})`}
          mask="url(#prodFade)"
        />
      ) : (
        Array.from({ length: n }).map((_, i) => (
          <image
            key={i}
            href={src}
            x={x + i * sw + 0.3}
            y={y + 0.3}
            width={sw - 0.6}
            height={h - 0.6}
            preserveAspectRatio="xMidYMid slice"
          />
        ))
      )}
    </g>
  );
}

function PartShape({ part }: { part: Part }) {
  const { x, y, w, h, kind } = part;
  const img = PART_IMAGE[kind];
  if (img) return <PhotoShape part={part} src={`/images/components/${img}.webp`} />;
  const cx = x + w / 2;
  const cy = y + h / 2;

  switch (kind) {
    case "busbar":
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={1} fill="url(#pcopper)" stroke="#6b4315" strokeWidth={0.6} />
          <rect x={x} y={y + 0.4} width={w} height={1.6} fill="#fff6e3" opacity={0.7} />
          <rect x={x} y={y + h - 1.5} width={w} height={1.1} fill="#4a2d0d" opacity={0.6} />
          {["#dc2626", "#16a34a", "#2563eb", "#64748b"].map((c, i) => (
            <rect key={c} x={x + 2 + i * (w / 4)} y={y + 0.7} width={3.2} height={h - 1.4} rx={0.4} fill={c} opacity={0.95} />
          ))}
          {["L1", "L2", "L3", "N"].map((t, i) => (
            <text
              key={t}
              x={x + 9 + i * (w / 4)}
              y={y + h / 2 + 2.1}
              fontSize={5.6}
              fontWeight={800}
              fill="#2a1706"
              fontFamily="monospace"
            >
              {t}
            </text>
          ))}
          {Array.from({ length: Math.max(2, Math.floor(w / 56)) }).map((_, i) => (
            <g key={i}>
              <circle cx={x + w - 15 - i * 56} cy={y + h / 2} r={2.4} fill="#6b4315" opacity={0.5} />
              <circle cx={x + w - 15 - i * 56} cy={y + h / 2} r={1.6} fill="#e0ab63" />
              <circle cx={x + w - 15.6 - i * 56} cy={y + h / 2 - 0.7} r={0.6} fill="#fff6e3" opacity={0.9} />
            </g>
          ))}
        </g>
      );
    case "acb":
      return (
        <g filter="url(#psoft)">
          {/* 外底座（金属） */}
          <rect x={x - 1.4} y={y + 4.6} width={w + 2.8} height={h - 9.2} rx={2.4} fill="url(#pmetal)" stroke="#4b5563" strokeWidth={0.5} />
          {/* 主面板（深色金属） */}
          <rect x={x} y={y} width={w} height={h} rx={2.2} fill="url(#ppanel)" stroke="#0b1220" strokeWidth={0.9} />
          <rect x={x + 1.4} y={y + 1.4} width={w - 2.8} height={h - 2.8} rx={1.6} fill="url(#pbrushed)" stroke="#2c3440" strokeWidth={0.5} />
          <rect x={x + 1.4} y={y + 1.4} width={w - 2.8} height={1.1} rx={0.55} fill="#ffffff" opacity={0.55} />
          {/* 四角铆钉 */}
          {[
            { ex: x + 4, ey: y + 4 },
            { ex: x + w - 4, ey: y + 4 },
            { ex: x + 4, ey: y + h - 4 },
            { ex: x + w - 4, ey: y + h - 4 },
          ].map((p, i) => (
            <g key={`acb-r${i}`}>
              <circle cx={p.ex} cy={p.ey} r={1.25} fill="url(#pscrew)" stroke="#1f2937" strokeWidth={0.3} />
              <circle cx={p.ex} cy={p.ey} r={0.5} fill="#1f2937" />
            </g>
          ))}
          {/* 上接线端子 */}
          <rect x={x + 4} y={y + 5.2} width={w - 8} height={6.4} rx={0.7} fill="#3b424d" stroke="#0f172a" strokeWidth={0.3} />
          {[0, 1, 2, 3].map((i) => (
            <Screw gradientId="pscrew" key={`at${i}`} cx={x + 11 + i * ((w - 22) / 3)} cy={y + 8.4} r={1.25} />
          ))}
          {/* 铭牌（金属拉丝） */}
          <rect x={x + 4.5} y={y + 13} width={w - 9} height={9.8} rx={0.7} fill="url(#pnameplate)" stroke="#64748b" strokeWidth={0.3} />
          <text x={cx} y={y + 17.9} textAnchor="middle" fontSize={4.2} fontWeight={700} fill="#1f2937" letterSpacing="0.35">
            MASTERPACT
          </text>
          <text x={cx} y={y + 21.5} textAnchor="middle" fontSize={2.3} fill="#475569">
            ACB 2000A · DRAW-OUT · 65kA
          </text>
          {/* 智能脱扣器（金属拉丝面板） */}
          <rect x={x + 4.5} y={y + 23} width={w - 9} height={17.4} rx={0.9} fill="url(#pbrushed)" stroke="#0b1220" strokeWidth={0.5} />
          {/* LCD 窗口 */}
          <rect x={x + 6.6} y={y + 24.8} width={25} height={9.6} rx={0.6} fill="#051411" stroke="#334155" strokeWidth={0.3} />
          <rect x={x + 7} y={y + 25.2} width={24.2} height={8.8} rx={0.5} fill="url(#plcd)" />
          <text x={x + 8.6} y={y + 31.4} fontSize={5.2} fontWeight={700} fill="#4ade80" fontFamily="monospace">
            2000
          </text>
          <text x={x + 30} y={y + 31.2} textAnchor="end" fontSize={2.5} fill="#86efac" fontFamily="monospace">
            A
          </text>
          {/* 按键 3x2 */}
          {[0, 1, 2].map((i) => (
            <rect key={`mk${i}`} x={x + 34 + i * 7.6} y={y + 26.2} width={5.4} height={2.3} rx={0.5} fill="#4b5563" stroke="#1f2937" strokeWidth={0.2} />
          ))}
          {[0, 1, 2].map((i) => (
            <rect key={`mk2${i}`} x={x + 34 + i * 7.6} y={y + 30.6} width={5.4} height={2.3} rx={0.5} fill="#374151" stroke="#1f2937" strokeWidth={0.2} />
          ))}
          <circle cx={x + w - 9} cy={y + 35} r={1.2} fill="url(#pled_g)" />
          <text x={x + 6.8} y={y + 39.2} fontSize={2.35} fill="#94a3b8" letterSpacing="0.2">
            MICROLOGIC 5.0 · Icw 50kA/1s
          </text>
          {/* 旋转操作手柄 */}
          <rect x={cx - 17} y={y + 42.6} width={34} height={23.4} rx={2.2} fill="#0b1220" stroke="#2c3440" strokeWidth={0.5} />
          <circle cx={cx} cy={y + 54.3} r={9.6} fill="#1f2937" stroke="#374151" strokeWidth={0.5} />
          <circle cx={cx} cy={y + 54.3} r={6.6} fill="#2b3440" stroke="#64748b" strokeWidth={0.3} />
          <path d={`M ${cx - 6.6} ${y + 49.6} A 8.2 8.2 0 0 1 ${cx + 6.6} ${y + 49.6}`} fill="none" stroke="#22c55e" strokeWidth={1.1} strokeLinecap="round" />
          <rect x={cx - 1.5} y={y + 48.4} width={3} height={7.8} rx={1.2} fill="url(#pchrome)" />
          <circle cx={cx} cy={y + 54.3} r={2.1} fill="#94a3b8" />
          <text x={cx - 13.2} y={y + 64.4} fontSize={2.6} fontWeight={700} fill="#22c55e">
            I
          </text>
          <text x={cx + 9.2} y={y + 64.4} fontSize={2.6} fontWeight={700} fill="#ef4444">
            O
          </text>
          {/* 底部按钮 —— CLOSE 绿 / OPEN 红 */}
          <g>
            <circle cx={x + 12} cy={y + 73.6} r={3.3} fill="url(#pchrome)" stroke="#1f2937" strokeWidth={0.35} />
            <circle cx={x + 12} cy={y + 73.6} r={2} fill="url(#pled_g)" />
          </g>
          <g>
            <circle cx={x + 24} cy={y + 73.6} r={3.3} fill="url(#pchrome)" stroke="#1f2937" strokeWidth={0.35} />
            <circle cx={x + 24} cy={y + 73.6} r={2} fill="url(#pled_r)" />
          </g>
          <text x={x + 30} y={y + 75} fontSize={2.3} fill="#cbd5e1" letterSpacing="0.1">
            CLOSE / OPEN
          </text>
          {/* 储能指示（警示琥珀） */}
          <rect x={x + w - 25} y={y + 70.2} width={18} height={6.8} rx={0.6} fill="url(#pwarn)" stroke="#7c2d12" strokeWidth={0.35} />
          <rect x={x + w - 24.4} y={y + 70.8} width={16.8} height={0.8} rx={0.3} fill="#ffffff" opacity={0.35} />
          <text x={x + w - 16} y={y + 75.2} textAnchor="middle" fontSize={2.3} fontWeight={700} fill="#431407" fontFamily="monospace">
            CHARGED
          </text>
          {/* 下接线端子 */}
          <rect x={x + 4} y={y + h - 9} width={w - 8} height={6.2} rx={0.7} fill="#3b424d" stroke="#0f172a" strokeWidth={0.3} />
          {[0, 1, 2, 3].map((i) => (
            <Screw gradientId="pscrew" key={`bt${i}`} cx={x + 11 + i * ((w - 22) / 3)} cy={y + h - 5.9} r={1.25} />
          ))}
        </g>
      );
    case "ct": {
      const r = Math.min(w, h) * 0.3;
      const cyc = y + h * 0.4;
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={2.4} fill="url(#ppanel)" stroke="#0b1220" strokeWidth={0.6} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={2} rx={1} fill="#64748b" opacity={0.6} />
          {/* 环氧浇注环（深灰底色 + 高光） */}
          <circle cx={cx} cy={cyc} r={r * 1.34} fill="#3a424d" stroke="#1f2937" strokeWidth={0.5} />
          <circle cx={cx} cy={cyc} r={r * 1.34} fill="none" stroke="#9aa5b1" strokeWidth={0.6} opacity={0.45} />
          <circle cx={cx} cy={cyc} r={r * 0.66} fill="#e2e8f0" stroke="#0f172a" strokeWidth={0.45} />
          <circle cx={cx} cy={cyc} r={r * 0.66} fill="none" stroke="#ffffff" strokeWidth={0.4} opacity={0.7} />
          {/* 贯穿铜排 */}
          <rect x={cx - 2.3} y={cyc - r * 0.62} width={4.6} height={r * 1.24} rx={0.4} fill="url(#pcopper)" stroke="#6b4315" strokeWidth={0.4} />
          <rect x={cx - 1.5} y={cyc - r * 0.58} width={1.1} height={r * 1.16} fill="#fff3de" opacity={0.7} />
          {/* 二次端子 */}
          <rect x={x + 3} y={y + h - 13.4} width={w - 6} height={7.6} rx={0.6} fill="#1f2937" stroke="#0f172a" strokeWidth={0.35} />
          <Screw gradientId="pscrew" cx={x + w * 0.36} cy={y + h - 9.6} r={1.15} />
          <Screw gradientId="pscrew" cx={x + w * 0.64} cy={y + h - 9.6} r={1.15} />
          <text x={cx} y={y + h - 2.2} textAnchor="middle" fontSize={2.1} fill="#cbd5e1" fontFamily="monospace">
            2000/5A · 0.5S
          </text>
        </g>
      );
    }
    case "meter":
      return (
        <g filter="url(#psoft)">
          {/* 外框：深色金属 */}
          <rect x={x} y={y} width={w} height={h} rx={2.4} fill="url(#ppanel)" stroke="#0b1220" strokeWidth={0.65} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={h - 2.4} rx={1.6} fill="url(#pbrushed)" stroke="#2c3440" strokeWidth={0.4} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={1} rx={0.5} fill="#9aa5b1" opacity={0.5} />
          {/* 顶部铭牌 */}
          <rect x={x + 4} y={y + 3.4} width={w - 8} height={h * 0.2} rx={0.6} fill="#0f172a" stroke="#334155" strokeWidth={0.3} />
          <text
            x={cx}
            y={y + 3.4 + h * 0.135}
            textAnchor="middle"
            fontSize={Math.min(w * 0.072, h * 0.135)}
            fontWeight={700}
            fill="#e2e8f0"
            letterSpacing="0.2"
          >
            PM8000 · 0.2S
          </text>
          {/* LCD 显示区（深色金属拉丝底座 + 绿色 LCD） */}
          <rect x={x + 4} y={y + h * 0.26} width={w - 8} height={h * 0.38} rx={0.8} fill="#051411" stroke="#0b1220" strokeWidth={0.5} />
          <rect x={x + 5.2} y={y + h * 0.272} width={w - 10.4} height={h * 0.356} rx={0.6} fill="url(#plcd)" />
          <text
            x={cx}
            y={y + h * 0.26 + h * 0.25}
            textAnchor="middle"
            fontSize={Math.min(10.4, h * 0.22)}
            fill="#4ade80"
            fontFamily="monospace"
            fontWeight={700}
          >
            235.6
          </text>
          <text x={cx} y={y + h * 0.26 + h * 0.355} textAnchor="middle" fontSize={2.8} fill="#86efac" fontFamily="monospace">
            V · A · kW · kWh
          </text>
          <rect x={x + 4} y={y + h * 0.665} width={w - 8} height={0.6} fill="#64748b" opacity={0.7} />
          {/* 按键 */}
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <circle cx={x + w / 2 - 13.5 + i * 9} cy={y + h * 0.735} r={1.9} fill="#4b5563" stroke="#1f2937" strokeWidth={0.3} />
              <circle cx={x + w / 2 - 13.9 + i * 9} cy={y + h * 0.72} r={0.7} fill="#cbd5e1" />
            </g>
          ))}
          {/* 底部端子 + 铅封 */}
          <rect x={x + 4} y={y + h - 8.4} width={w - 8} height={5.4} rx={0.6} fill="#1f2937" stroke="#0f172a" strokeWidth={0.3} />
          <Screw gradientId="pscrew" cx={x + 10} cy={y + h - 5.7} r={1.1} />
          <Screw gradientId="pscrew" cx={x + w - 10} cy={y + h - 5.7} r={1.1} />
          <circle cx={x + w - 3.2} cy={y + h - 3.2} r={1.5} fill="url(#pled_r)" />
        </g>
      );
    case "spd":
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={1.6} fill="url(#pdevice)" stroke="#7d8794" strokeWidth={0.5} />
          {/* 4 模数底座 */}
          {[0, 1, 2, 3].map((i) => {
            const mx = x + 2 + i * ((w - 4) / 4);
            const mw = (w - 4) / 4 - 0.8;
            return (
              <g key={i}>
                <rect x={mx} y={y + 2} width={mw} height={h - 4} rx={0.6} fill="#eef2f7" stroke="#8d98a4" strokeWidth={0.35} />
                <rect x={mx + 1} y={y + 3} width={mw - 2} height={2.6} rx={0.3} fill="#5b6472" />
                <rect x={mx + 1} y={y + h - 5.6} width={mw - 2} height={2.6} rx={0.3} fill="#5b6472" />
                <rect x={mx + 1.4} y={y + h * 0.3} width={mw - 2.8} height={h * 0.22} rx={0.4} fill="#2b323b" stroke="#111827" strokeWidth={0.25} />
                {/* 状态窗：绿色 = 正常，红色 = 失效 */}
                <rect x={mx + 2.2} y={y + h * 0.34} width={mw - 4.4} height={h * 0.14} rx={0.3} fill={i === 3 ? "url(#pled_r)" : "url(#pled_g)"} />
                <rect x={mx + 2.2} y={y + h * 0.34} width={mw - 4.4} height={h * 0.045} rx={0.2} fill="#ffffff" opacity={0.35} />
              </g>
            );
          })}
          {/* 顶部文字警示色 */}
          <text x={cx} y={y + h * 0.68} textAnchor="middle" fontSize={3} fontWeight={700} fill="#b45309">
            SPD 40kA · 4P
          </text>
          <text x={cx} y={y + h * 0.795} textAnchor="middle" fontSize={2.4} fill="#475569" fontFamily="monospace">
            T2 · Up 1.5kV
          </text>
        </g>
      );
    case "button":
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={1.6} fill="url(#pface)" stroke="#9aa5b1" strokeWidth={0.5} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={1} fill="#ffffff" opacity={0.9} />
          {[
            { grad: "url(#pled_g)", t: "I", l: "CLOSE" },
            { grad: "url(#pled_r)", t: "O", l: "OPEN" },
            { grad: "url(#pwarn)", t: "R", l: "RESET" },
          ].map((b, i) => (
            <g key={b.t}>
              <circle cx={x + 16 + i * 26} cy={y + 10} r={6.6} fill="url(#pchrome)" stroke="#6b7280" strokeWidth={0.4} />
              <circle cx={x + 16 + i * 26} cy={y + 10.2} r={4.9} fill={b.grad} />
              <circle cx={x + 15.4 + i * 26} cy={y + 8.8} r={2.2} fill="url(#pgloss)" />
              <text x={x + 16 + i * 26} y={y + 20.4} textAnchor="middle" fontSize={2.3} fill="#334155">
                {b.l}
              </text>
            </g>
          ))}
          <Screw gradientId="pscrew" cx={x + 4} cy={y + 4} r={0.95} />
          <Screw gradientId="pscrew" cx={x + w - 4} cy={y + 4} r={0.95} />
        </g>
      );
    case "lamp":
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={1.6} fill="url(#pface)" stroke="#9aa5b1" strokeWidth={0.5} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={1} fill="#ffffff" opacity={0.9} />
          {["url(#pled_r)", "url(#pled_g)", "url(#pwarn)"].map((c, i) => (
            <g key={c}>
              <circle cx={x + 10 + i * 16.5} cy={y + 9.6} r={5.4} fill="url(#pchrome)" stroke="#6b7280" strokeWidth={0.35} />
              <circle cx={x + 10 + i * 16.5} cy={y + 9.6} r={3.9} fill={c} />
              <circle cx={x + 10 + i * 16.5} cy={y + 9.6} r={3.9} fill="url(#pgloss)" />
              <text x={x + 10 + i * 16.5} y={y + 20.4} textAnchor="middle" fontSize={2.2} fill="#334155">
                {["RUN", "FAULT", "ALARM"][i]}
              </text>
            </g>
          ))}
        </g>
      );
    case "selector":
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={1.6} fill="url(#pface)" stroke="#9aa5b1" strokeWidth={0.5} />
          <circle cx={x + 13} cy={y + h / 2 - 1.2} r={7.4} fill="url(#pchrome)" stroke="#6b7280" strokeWidth={0.4} />
          <circle cx={x + 13} cy={y + h / 2 - 1.2} r={5.4} fill="#1f2937" stroke="#111827" strokeWidth={0.35} />
          <circle cx={x + 13} cy={y + h / 2 - 1.2} r={2.2} fill="#94a3b8" />
          <rect x={x + 12} y={y + h / 2 - 6.6} width={2} height={5.4} rx={1} fill="#f8fafc" />
          <text x={x + 22} y={y + 9.4} fontSize={2.7} fontWeight={700} fill="#b45309">
            LOCAL
          </text>
          <text x={x + 22} y={y + 14.6} fontSize={2.7} fill="#334155">
            REMOTE
          </text>
          <text x={x + 22} y={y + 20} fontSize={2.2} fill="#64748b">
            AUTO / MANUAL
          </text>
        </g>
      );
    case "live":
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={1.6} fill="url(#pface)" stroke="#9aa5b1" strokeWidth={0.5} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={1} fill="#ffffff" opacity={0.9} />
          {["url(#pled_rn)", "url(#pled_g)", "url(#pled_r)"].map((c, i) => (
            <g key={c}>
              <circle cx={x + 12 + i * 20} cy={y + 10.4} r={5.4} fill="url(#pchrome)" stroke="#6b7280" strokeWidth={0.35} />
              <circle cx={x + 12 + i * 20} cy={y + 10.4} r={3.8} fill="#fde68a" />
              <circle cx={x + 12 + i * 20} cy={y + 10.4} r={2.2} fill={c} />
              <circle cx={x + 12 + i * 20} cy={y + 10.4} r={3.8} fill="url(#pgloss)" />
              <text x={x + 12 + i * 20} y={y + 24} textAnchor="middle" fontSize={2.6} fontWeight={700} fill="#334155">
                {["L1", "L2", "L3"][i]}
              </text>
            </g>
          ))}
        </g>
      );
    case "fuse":
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={1.2} fill="url(#pdevice)" stroke="#7d8794" strokeWidth={0.5} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={0.8} fill="#c9d1da" stroke="#8d98a4" strokeWidth={0.3} />
          <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={1} fill="#eef2f7" />
          <rect x={x + w * 0.28} y={y + 5} width={w * 0.44} height={h - 10} rx={w * 0.18} fill="#b9c3ce" stroke="#8d98a4" strokeWidth={0.3} />
          <rect x={x + w * 0.32} y={y + 6.4} width={w * 0.36} height={h - 12.8} rx={w * 0.15} fill="#fdf1c2" opacity={0.95} />
          <line x1={cx} y1={y + 8} x2={cx} y2={y + h - 8} stroke="#d97706" strokeWidth={0.5} />
          <rect x={x + w * 0.25} y={y + 3.4} width={w * 0.5} height={2.6} rx={0.4} fill="#5b6472" stroke="#39414d" strokeWidth={0.25} />
          <rect x={x + w * 0.25} y={y + h - 6} width={w * 0.5} height={2.6} rx={0.4} fill="#5b6472" stroke="#39414d" strokeWidth={0.25} />
        </g>
      );
    case "terminal": {
      const n = Math.max(6, Math.floor((w - 6) / 10));
      const step = (w - 6) / n;
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={1.2} fill="#6b7280" stroke="#39414d" strokeWidth={0.5} />
          <rect x={x + 0.8} y={y + 0.8} width={w - 1.6} height={h - 1.6} rx={0.8} fill="#c9d1da" />
          <rect x={x + 0.8} y={y + 0.8} width={w - 1.6} height={1.1} fill="#ffffff" opacity={0.85} />
          {Array.from({ length: n }).map((_, i) => (
            <g key={i}>
              <rect
                x={x + 2 + i * step}
                y={y + 1.8}
                width={step - 1}
                height={h - 3.6}
                rx={0.5}
                fill="#a9b3bf"
                stroke="#8d98a4"
                strokeWidth={0.25}
              />
              <rect x={x + 2 + i * step} y={y + 2.6} width={step - 1} height={2.2} rx={0.3} fill="#eef2f7" stroke="#8d98a4" strokeWidth={0.2} />
              <rect x={x + 2 + i * step} y={y + h - 4.8} width={step - 1} height={2.2} rx={0.3} fill="#eef2f7" stroke="#8d98a4" strokeWidth={0.2} />
              <Screw gradientId="pscrew" cx={x + 2 + i * step + (step - 1) / 2} cy={y + h / 2} r={Math.min(1.9, step * 0.24)} />
            </g>
          ))}
          <rect x={x + w - 3.4} y={y + 1.8} width={2} height={h - 3.6} rx={0.5} fill="#2563eb" opacity={0.9} />
        </g>
      );
    }
    case "cableentry":
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={1.5} fill="url(#ppanel)" stroke="#0b1220" strokeWidth={0.6} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={1.4} fill="#94a3b8" opacity={0.55} />
          <rect x={x + 1} y={y + h - 2.2} width={w - 2} height={1.2} fill="#0b1220" opacity={0.4} />
          {[
            { c: "#dc2626", n: "L1" },
            { c: "#1e293b", n: "L2" },
            { c: "#64748b", n: "L3" },
            { c: "#2563eb", n: "N" },
          ].map((k, i) => (
            <g key={k.n}>
              <rect x={x + 27 + i * 42} y={y + 22} width={6.4} height={h - 32} rx={1.4} fill={k.c} stroke="#0b1220" strokeWidth={0.3} />
              <rect x={x + 27.6 + i * 42} y={y + 24} width={1.6} height={h - 36} fill="#ffffff" opacity={0.22} />
              <circle cx={x + 30.2 + i * 42} cy={y + 15} r={9} fill="url(#pchrome)" stroke="#1f2937" strokeWidth={0.5} />
              <circle cx={x + 30.2 + i * 42} cy={y + 15} r={6.4} fill="#475569" stroke="#1f2937" strokeWidth={0.35} />
              <circle cx={x + 30.2 + i * 42} cy={y + 15} r={3.4} fill={k.c} />
              <circle cx={x + 30.2 + i * 42} cy={y + 15} r={1.2} fill="#e6ebf0" />
              <text x={x + 30.2 + i * 42} y={y + 4.8} textAnchor="middle" fontSize={2.4} fontWeight={700} fill="#cbd5e1">
                {k.n}
              </text>
            </g>
          ))}
          <circle cx={x + 198} cy={y + 15} r={9} fill="url(#pchrome)" stroke="#1f2937" strokeWidth={0.5} />
          <circle cx={x + 198} cy={y + 15} r={6.4} fill="#475569" stroke="#1f2937" strokeWidth={0.35} />
          <rect x={x + 195} y={y + 22} width={6} height={h - 32} rx={1.4} fill="#16a34a" stroke="#14532d" strokeWidth={0.3} />
          <line x1={x + 198} y1={y + 24} x2={x + 198} y2={y + h - 12} stroke="#facc15" strokeWidth={2.6} strokeDasharray="4 3" />
          <text x={x + 198} y={y + 4.8} textAnchor="middle" fontSize={2.4} fontWeight={700} fill="#cbd5e1">
            PE
          </text>
          <text x={x + 6} y={y + h - 3.2} fontSize={2.7} fill="#cbd5e1" fontFamily="monospace">
            4×240mm² Cu + PE · bottom entry
          </text>
        </g>
      );
    case "pebar":
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={0.8} fill="url(#pcopper)" stroke="#6b4315" strokeWidth={0.5} />
          <rect x={x} y={y + 0.4} width={w} height={1} fill="#fff4dc" opacity={0.55} />
          <rect x={x} y={y + h - 1.2} width={w} height={0.8} fill="#4a2d0d" opacity={0.5} />
          {Array.from({ length: 8 }).map((_, i) => (
            <rect
              key={`s${i}`}
              x={x + w - 36 + i * 4.2}
              y={y}
              width={4.2}
              height={h}
              fill={i % 2 === 0 ? "#16a34a" : "#facc15"}
              opacity={0.95}
            />
          ))}
          {Array.from({ length: Math.floor(w / 30) }).map((_, i) => (
            <g key={i}>
              <circle cx={x + 16 + i * 30} cy={y + h / 2} r={1.9} fill="#6b4315" opacity={0.6} />
              <circle cx={x + 16 + i * 30} cy={y + h / 2} r={1.2} fill="#e0ab63" />
            </g>
          ))}
          <text x={x + 4} y={y + h - 2.8} fontSize={4.4} fontWeight={700} fill="#2a1706">
            PE
          </text>
        </g>
      );
    case "testtb": {
      const n = 8;
      const step = (w - 8) / n;
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={1.4} fill="url(#ppanel)" stroke="#0b1220" strokeWidth={0.55} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={h - 2.4} rx={0.9} fill="#2b323b" stroke="#0f172a" strokeWidth={0.35} />
          <rect x={x + 2.4} y={y + 2.6} width={w - 4.8} height={h * 0.52} rx={0.6} fill="#1f2937" stroke="#0f172a" strokeWidth={0.3} />
          {Array.from({ length: n }).map((_, i) => (
            <g key={i}>
              <rect
                x={x + 3.6 + i * step}
                y={y + 3.8}
                width={step - 1.4}
                height={h * 0.4}
                rx={0.4}
                fill="#0f172a"
                stroke="#475569"
                strokeWidth={0.25}
              />
              <circle cx={x + 3.6 + i * step + (step - 1.4) / 2} cy={y + 3.8 + h * 0.2} r={Math.min(2.1, step * 0.3)} fill="#0f172a" />
              <circle
                cx={x + 3.6 + i * step + (step - 1.4) / 2}
                cy={y + 3.8 + h * 0.2}
                r={Math.min(1.2, step * 0.18)}
                fill="#fbbf24"
              />
              <text
                x={x + 3.6 + i * step + (step - 1.4) / 2}
                y={y + h - 2.4}
                textAnchor="middle"
                fontSize={2.2}
                fill="#cbd5e1"
                fontFamily="monospace"
              >
                {i + 1}
              </text>
            </g>
          ))}
          <rect x={x + 2.4} y={y + 2.6} width={w - 4.8} height={h * 0.52} rx={0.6} fill="#ffffff" opacity={0.12} />
        </g>
      );
    }
    case "junction":
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={1.6} fill="url(#ppanel)" stroke="#0b1220" strokeWidth={0.6} />
          <rect x={x + 1.4} y={y + 1.4} width={w - 2.8} height={h - 2.8} rx={1.1} fill="#2b323b" stroke="#475569" strokeWidth={0.35} />
          <rect x={x + 3.4} y={y + 3.2} width={w - 6.8} height={h - 9.4} rx={0.8} fill="#0f172a" stroke="#1f2937" strokeWidth={0.35} />
          <rect x={x + 3.4} y={y + 3.2} width={w - 6.8} height={2.2} rx={0.8} fill="#94a3b8" opacity={0.25} />
          {[0, 1, 2, 3].map((i) => (
            <Screw gradientId="pscrew" key={i} cx={x + 11 + i * 13} cy={y + h * 0.4} r={1.7} />
          ))}
          <circle cx={x + w - 9} cy={y + h * 0.4} r={3.2} fill="url(#pled_r)" />
          <circle cx={x + w - 9} cy={y + h * 0.4} r={1.4} fill="#fecaca" opacity={0.6} />
          <line x1={x + w - 9} y1={y + h * 0.4} x2={x + w - 4.5} y2={y + h * 0.4 + 4.2} stroke="#f87171" strokeWidth={0.7} />
          <text x={x + 4.6} y={y + h - 3.2} fontSize={2.7} fill="#fbbf24" fontFamily="monospace">
            ANTI-OPEN · SEALED
          </text>
        </g>
      );
    case "controller":
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={2.2} fill="url(#ppanel)" stroke="#0b1220" strokeWidth={0.7} />
          <rect x={x + 1.4} y={y + 1.4} width={w - 2.8} height={h - 2.8} rx={1.5} fill="url(#pbrushed)" stroke="#2c3440" strokeWidth={0.4} />
          <rect x={x + 1.4} y={y + 1.4} width={w - 2.8} height={1} fill="#94a3b8" opacity={0.5} />
          {[
            { ex: x + 4, ey: y + 4 },
            { ex: x + w - 4, ey: y + 4 },
            { ex: x + 4, ey: y + h - 4 },
            { ex: x + w - 4, ey: y + h - 4 },
          ].map((p, i) => (
            <circle key={`c-r${i}`} cx={p.ex} cy={p.ey} r={1} fill="url(#pscrew)" stroke="#1f2937" strokeWidth={0.3} />
          ))}
          <rect x={x + 5} y={y + 4} width={w - 10} height={h * 0.44} rx={0.7} fill="#051411" stroke="#0b1220" strokeWidth={0.4} />
          <rect x={x + 5.8} y={y + 4.8} width={w - 11.6} height={h * 0.424} rx={0.5} fill="url(#plcd)" />
          <text x={x + 8.6} y={y + 4 + h * 0.26} fontSize={10.2} fontWeight={700} fill="#4ade80" fontFamily="monospace">
            0.98
          </text>
          <text x={x + 8.6} y={y + h * 0.465} fontSize={2.6} fill="#86efac" fontFamily="monospace">
            COS φ
          </text>
          <text x={x + w - 7} y={y + 4 + h * 0.18} textAnchor="end" fontSize={2.8} fill="#86efac" fontFamily="monospace">
            12 STEPS
          </text>
          <rect x={x + 8.6} y={y + h * 0.485} width={30} height={1.2} rx={0.6} fill="#450a0a" />
          <rect x={x + 8.6} y={y + h * 0.485} width={26} height={1.2} rx={0.6} fill="url(#pwarn)" opacity={0.95} />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <circle cx={x + 12 + i * 14} cy={y + h - 9.6} r={3.1} fill="#1f2937" stroke="#475569" strokeWidth={0.35} />
              <circle cx={x + 12 + i * 14} cy={y + h - 10.4} r={1.1} fill="#94a3b8" />
            </g>
          ))}
          <circle cx={x + w - 12} cy={y + h - 9.6} r={1.5} fill="url(#pled_g)" />
          <text x={x + w - 7} y={y + h - 4.4} textAnchor="end" fontSize={2.8} fill="#cbd5e1" fontWeight={700} letterSpacing="0.3">
            VARLOGIC
          </text>
        </g>
      );
    case "contactor":
      return (
        <g filter="url(#psoft)">
          {/* 本体：浅灰热塑外壳 */}
          <rect x={x} y={y} width={w} height={h} rx={1.6} fill="url(#pdevice)" stroke="#7d8794" strokeWidth={0.5} />
          <rect x={x} y={y} width={w} height={1} fill="#ffffff" opacity={0.9} />
          {/* 上下接线端子（各 3 相） */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={x + 3.4 + i * ((w - 6.8) / 3)} y={y + 2} width={(w - 8) / 3} height={5.4} rx={0.5} fill="#5b6472" stroke="#39414d" strokeWidth={0.25} />
              <Screw gradientId="pscrew" cx={x + 3.4 + i * ((w - 6.8) / 3) + (w - 8) / 6} cy={y + 4.7} r={1.05} />
              <rect x={x + 3.4 + i * ((w - 6.8) / 3)} y={y + h - 7.4} width={(w - 8) / 3} height={5.4} rx={0.5} fill="#5b6472" stroke="#39414d" strokeWidth={0.25} />
              <Screw gradientId="pscrew" cx={x + 3.4 + i * ((w - 6.8) / 3) + (w - 8) / 6} cy={y + h - 4.7} r={1.05} />
            </g>
          ))}
          {/* 中间磁系统腔 */}
          <rect x={x + 3} y={y + 9} width={w - 6} height={h - 18} rx={0.8} fill="#e5eaf0" stroke="#a9b3bf" strokeWidth={0.35} />
          <rect x={x + 3} y={y + 9} width={w - 6} height={0.9} fill="#ffffff" opacity={0.9} />
          <text x={cx} y={y + h / 2 - 1.4} textAnchor="middle" fontSize={4.2} fontWeight={700} fill="#1f2937">
            KM
          </text>
          <text x={cx} y={y + h / 2 + 4.2} textAnchor="middle" fontSize={2.2} fill="#64748b" fontFamily="monospace">
            AC-3 · 40A
          </text>
          {/* 品牌条 + 状态指示 */}
          <rect x={x + 3} y={y + h - 8.6} width={w - 6} height={1.8} rx={0.6} fill="#3dcd58" opacity={0.9} />
          <circle cx={x + w - 6.4} cy={y + 11.6} r={1.1} fill="url(#pled_g)" stroke="#166534" strokeWidth={0.2} />
        </g>
      );
    case "reactor":
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={1.4} fill="url(#ppanel)" stroke="#0b1220" strokeWidth={0.5} />
          <rect x={x + 2} y={y + 2} width={w - 4} height={h - 13} rx={0.8} fill="#1f2937" stroke="#0f172a" strokeWidth={0.35} />
          {Array.from({ length: Math.max(4, Math.floor((h - 16) / 2.6)) }).map((_, i) => (
            <line
              key={i}
              x1={x + 2.6}
              y1={y + 4 + i * 2.6}
              x2={x + w - 2.6}
              y2={y + 4 + i * 2.6}
              stroke="#0f172a"
              strokeWidth={0.35}
              opacity={0.6}
            />
          ))}
          {[0, 1, 2].map((i) => {
            const cw = (w - 8.8) / 3;
            return (
              <g key={i}>
                <rect
                  x={x + 4.4 + i * cw}
                  y={y + 5}
                  width={cw - 0.8}
                  height={h - 19}
                  rx={1.4}
                  fill="url(#pcoil)"
                  stroke="#6b4315"
                  strokeWidth={0.3}
                />
                {Array.from({ length: 6 }).map((_, k) => (
                  <line
                    key={k}
                    x1={x + 4.8 + i * cw}
                    y1={y + 7 + k * ((h - 23) / 5)}
                    x2={x + 4.4 + i * cw + cw - 1.2}
                    y2={y + 7 + k * ((h - 23) / 5)}
                    stroke="#6b4315"
                    strokeWidth={0.25}
                    opacity={0.5}
                  />
                ))}
              </g>
            );
          })}
          <rect x={x + 3.4} y={y + h - 11} width={w - 6.8} height={4.2} rx={0.5} fill="#0f172a" />
          <text x={cx} y={y + h - 1.8} textAnchor="middle" fontSize={2.5} fontWeight={700} fill="#cbd5e1">
            7%
          </text>
        </g>
      );
    case "capacitor":
      return (
        <g filter="url(#psoft)">
          <rect x={x + 7} y={y + 6} width={w - 14} height={h - 13} rx={8} fill="url(#palu)" stroke="#374151" strokeWidth={0.6} />
          <rect x={x + 10} y={y + 9} width={2.2} height={h - 19} rx={1.1} fill="#ffffff" opacity={0.4} />
          <rect x={x + 7} y={y + 6} width={w - 14} height={3} rx={1.5} fill="#f8fafc" opacity={0.4} />
          {[0, 1, 2].map((i) => (
            <line
              key={i}
              x1={x + 8}
              y1={y + h - 16 + i * 3}
              x2={x + w - 8}
              y2={y + h - 16 + i * 3}
              stroke="#475569"
              strokeWidth={0.4}
              opacity={0.5}
            />
          ))}
          <rect x={cx - 10} y={y + 1} width={20} height={6.4} rx={1.6} fill="#0f172a" stroke="#1f2937" strokeWidth={0.35} />
          <Screw gradientId="pscrew" cx={cx - 6} cy={y + 4.2} r={1.3} />
          <Screw gradientId="pscrew" cx={cx + 6} cy={y + 4.2} r={1.3} />
          <rect x={x + 13} y={cy - 10} width={w - 26} height={20} rx={1} fill="#0f172a" opacity={0.88} />
          <text x={cx} y={cy - 2.2} textAnchor="middle" fontSize={5.6} fontWeight={700} fill="#fbbf24" fontFamily="monospace">
            60
          </text>
          <text x={cx} y={cy + 1.8} textAnchor="middle" fontSize={2.8} fill="#cbd5e1">
            kvar
          </text>
          <text x={cx} y={cy + 6} textAnchor="middle" fontSize={2.2} fill="#94a3b8" fontFamily="monospace">
            0.45kV · 3×
          </text>
          <rect x={x + 13} y={y + h - 8.4} width={w - 26} height={4.2} rx={0.6} fill="#0f766e" opacity={0.9} />
          <text x={cx} y={y + h - 5.2} textAnchor="middle" fontSize={2.2} fill="#ecfeff">
            SELF-HEALING
          </text>
        </g>
      );
    case "fan": {
      const r = Math.min(w, h) / 2 - 5;
      return (
        <g filter="url(#psoft)">
          <rect x={x} y={y} width={w} height={h} rx={2.4} fill="url(#ppanel)" stroke="#0b1220" strokeWidth={0.55} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={h - 2.4} rx={1.6} fill="#1f2937" />
          <circle cx={cx} cy={cy} r={r + 1.6} fill="#0b1220" stroke="#475569" strokeWidth={0.45} />
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse
              key={i}
              cx={cx}
              cy={cy - r * 0.58}
              rx={r * 0.26}
              ry={r * 0.62}
              fill="#9aa5b1"
              opacity={0.75}
              transform={`rotate(${i * 72} ${cx} ${cy})`}
            />
          ))}
          <circle cx={cx} cy={cy} r={r * 0.32} fill="#cbd5e1" stroke="#64748b" strokeWidth={0.3} />
          <circle cx={cx} cy={cy} r={r * 0.12} fill="#475569" />
          {[
            { px: x + 3.6, py: y + 3.6 },
            { px: x + w - 3.6, py: y + 3.6 },
            { px: x + 3.6, py: y + h - 3.6 },
            { px: x + w - 3.6, py: y + h - 3.6 },
          ].map((pt) => (
            <Screw gradientId="pscrew" key={`${pt.px}-${pt.py}`} cx={pt.px} cy={pt.py} r={1.1} />
          ))}
        </g>
      );
    }
    case "drawer": {
      const no = part.key.replace(/\D/g, "") || "1";
      const winW = w - 26;
      const devW = winW - 6;
      return (
        <g filter="url(#psoft)">
          {/* 单元外框：深灰喷涂钢板 */}
          <rect x={x} y={y} width={w} height={h} rx={1.6} fill="url(#ppanel)" stroke="#0b1220" strokeWidth={0.6} />
          {/* 前面板：浅灰喷塑钢板 */}
          <rect x={x + 2.4} y={y + 2.4} width={w - 4.8} height={h - 4.8} rx={1.3} fill="url(#pface)" stroke="#9aa5b1" strokeWidth={0.45} />
          <rect x={x + 2.4} y={y + 2.4} width={w - 4.8} height={1} rx={0.5} fill="#ffffff" opacity={0.85} />
          <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={1} fill="none" stroke="#b9c3ce" strokeWidth={0.3} />

          {/* 回路号标签 */}
          <rect x={x + 5.6} y={y + 6.2} width={23} height={6.2} rx={0.5} fill="#334155" />
          <text x={x + 7.2} y={y + 10.6} fontSize={3.1} fontWeight={700} fill="#f8fafc" fontFamily="monospace">
            1-0{no}
          </text>
          {/* 状态 LED */}
          <circle cx={x + 34} cy={y + 9.3} r={1.5} fill="url(#pled_g)" stroke="#166534" strokeWidth={0.2} />
          <circle cx={x + 41} cy={y + 9.3} r={1.5} fill="url(#pled_r)" stroke="#7f1d1d" strokeWidth={0.2} />

          {/* 观察窗（内凹） */}
          <rect x={x + 5} y={y + 14.6} width={winW} height={41} rx={1} fill="#1b2430" stroke="#0b1220" strokeWidth={0.5} />
          <rect x={x + 5.6} y={y + 15.2} width={winW - 1.2} height={1} fill="#000000" opacity={0.55} />

          {/* 窗内 MCCB 塑壳断路器 */}
          <rect x={x + 8} y={y + 17.6} width={devW} height={35} rx={1.1} fill="url(#pdevice)" stroke="#7d8794" strokeWidth={0.45} />
          <rect x={x + 8} y={y + 17.6} width={devW} height={1.1} rx={0.5} fill="#ffffff" opacity={0.9} />
          {/* 上下接线端子（各 3 相） */}
          {[0, 1, 2].map((i) => (
            <g key={`tm-${i}`}>
              <rect x={x + 11 + i * ((devW - 6) / 3)} y={y + 19.4} width={5.2} height={5.2} rx={0.6} fill="#5b6472" stroke="#39414d" strokeWidth={0.25} />
              <Screw gradientId="pscrew" cx={x + 13.6 + i * ((devW - 6) / 3)} cy={y + 22} r={1.15} />
              <rect x={x + 11 + i * ((devW - 6) / 3)} y={y + 45.6} width={5.2} height={5.2} rx={0.6} fill="#5b6472" stroke="#39414d" strokeWidth={0.25} />
              <Screw gradientId="pscrew" cx={x + 13.6 + i * ((devW - 6) / 3)} cy={y + 48.2} r={1.15} />
            </g>
          ))}
          {/* 手柄与分合指示 */}
          <rect x={x + 8 + devW / 2 - 9} y={y + 30.4} width={18} height={9.4} rx={1} fill="#111827" stroke="#000000" strokeWidth={0.3} />
          <rect x={x + 8 + devW / 2 - 7.6} y={y + 32.2} width={15.2} height={2.6} rx={1.2} fill="#e2e8f0" />
          <rect x={x + 8 + devW / 2 - 7.6} y={y + 35.6} width={15.2} height={2.6} rx={1.2} fill="#94a3b8" opacity={0.75} />
          <circle cx={x + 10.4} cy={y + 37.4} r={1.1} fill="#22c55e" />
          <text x={x + 8} y={y + 27.4} fontSize={2.5} fill="#475569" fontFamily="monospace">
            iC60N
          </text>
          <text x={x + 8 + devW} y={y + 27.4} textAnchor="end" fontSize={2.4} fill="#64748b" fontFamily="monospace">
            3P
          </text>
          <text x={x + 7} y={y + 59.4} fontSize={2.4} fill="#cbd5e1" fontFamily="monospace">
            MCCB 32A · 6kA
          </text>

          {/* KM / FR 模块 */}
          <rect x={x + 5.6} y={y + 62.4} width={(w - 26) / 2 - 1.4} height={17} rx={1} fill="url(#pdevice)" stroke="#7d8794" strokeWidth={0.4} />
          <rect x={x + 5.6} y={y + 62.4} width={(w - 26) / 2 - 1.4} height={0.9} fill="#ffffff" opacity={0.85} />
          <text x={x + 5.6 + ((w - 26) / 2 - 1.4) / 2} y={y + 73.4} textAnchor="middle" fontSize={3.3} fontWeight={700} fill="#1f2937">
            KM
          </text>
          <rect x={x + 5.6 + (w - 26) / 2 + 0.2} y={y + 62.4} width={(w - 26) / 2 - 1.4} height={17} rx={1} fill="url(#pdevice)" stroke="#7d8794" strokeWidth={0.4} />
          <rect x={x + 5.6 + (w - 26) / 2 + 0.2} y={y + 62.4} width={(w - 26) / 2 - 1.4} height={0.9} fill="#ffffff" opacity={0.85} />
          <text
            x={x + 5.6 + (w - 26) / 2 + 0.2 + ((w - 26) / 2 - 1.4) / 2}
            y={y + 73.4}
            textAnchor="middle"
            fontSize={3.3}
            fontWeight={700}
            fill="#1f2937"
          >
            FR
          </text>

          {/* 运行指示 */}
          <circle cx={x + 8} cy={y + h - 7} r={1.6} fill="url(#pled_g)" stroke="#166534" strokeWidth={0.2} />
          <text x={x + 12} y={y + h - 5.8} fontSize={2.3} fill="#475569">
            CLOSED
          </text>

          {/* 右侧操作手柄与位置指示 */}
          <rect x={x + w - 17.5} y={y + 6} width={11.5} height={h - 12} rx={2} fill="#cbd4dd" stroke="#8d98a4" strokeWidth={0.4} />
          <rect x={x + w - 17.5} y={y + 6} width={11.5} height={1} fill="#ffffff" opacity={0.9} />
          <rect x={x + w - 11.7} y={y + 10} width={1.6} height={h - 20} rx={0.8} fill="#5b6472" opacity={0.45} />
          <rect x={x + w - 15.4} y={y + 16} width={7.2} height={22} rx={2} fill="url(#pchrome)" stroke="#6b7280" strokeWidth={0.35} />
          <rect x={x + w - 14.6} y={y + 18} width={5.6} height={2.4} rx={1} fill="#ffffff" opacity={0.9} />
          <circle cx={x + w - 11.8} cy={y + 52} r={2.6} fill="#1f2937" stroke="#6b7280" strokeWidth={0.3} />
          <circle cx={x + w - 11.8} cy={y + 52} r={1.3} fill="#4ade80" />
          <text x={x + w - 19} y={y + 56.4} textAnchor="middle" fontSize={2} fill="#166534" fontFamily="monospace">
            CONN
          </text>
          <text x={x + w - 19} y={y + h - 6.4} textAnchor="middle" fontSize={2.3} fill="#475569" fontFamily="monospace" fontWeight={700}>
            MNS
          </text>
        </g>
      );
    }
    case "fixed":
      return (
        <g filter="url(#psoft)">
          {/* 单元外框 + 浅灰喷塑面板 */}
          <rect x={x} y={y} width={w} height={h} rx={1.6} fill="url(#ppanel)" stroke="#0b1220" strokeWidth={0.6} />
          <rect x={x + 2.4} y={y + 2.4} width={w - 4.8} height={h - 4.8} rx={1.3} fill="url(#pface)" stroke="#9aa5b1" strokeWidth={0.45} />
          <rect x={x + 2.4} y={y + 2.4} width={w - 4.8} height={1} rx={0.5} fill="#ffffff" opacity={0.85} />
          <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={1} fill="none" stroke="#b9c3ce" strokeWidth={0.3} />

          {/* DIN 导轨 */}
          <rect x={x + 5.6} y={y + 5.4} width={w - 11.2} height={5.6} rx={0.6} fill="url(#pmetal)" stroke="#7d8794" strokeWidth={0.35} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect key={`dr-${i}`} x={x + 10 + i * ((w - 22) / 7)} y={y + 7} width={2.4} height={2.4} rx={0.3} fill="#5b6472" opacity={0.75} />
          ))}

          {/* 塑壳断路器 MCCB */}
          <rect x={x + 5.6} y={y + 13} width={52} height={30} rx={1} fill="url(#pdevice)" stroke="#7d8794" strokeWidth={0.45} />
          <rect x={x + 5.6} y={y + 13} width={52} height={1} fill="#ffffff" opacity={0.9} />
          {[0, 1, 2].map((i) => (
            <g key={`f-tm-${i}`}>
              <rect x={x + 9 + i * 15} y={y + 14.4} width={5.4} height={5} rx={0.5} fill="#5b6472" stroke="#39414d" strokeWidth={0.25} />
              <Screw gradientId="pscrew" cx={x + 11.7 + i * 15} cy={y + 16.9} r={1.1} />
              <rect x={x + 9 + i * 15} y={y + 36.6} width={5.4} height={5} rx={0.5} fill="#5b6472" stroke="#39414d" strokeWidth={0.25} />
              <Screw gradientId="pscrew" cx={x + 11.7 + i * 15} cy={y + 39.1} r={1.1} />
            </g>
          ))}
          <rect x={x + 20} y={y + 24.4} width={22} height={8.4} rx={1} fill="#111827" />
          <rect x={x + 21.6} y={y + 26} width={18.8} height={2.4} rx={1.1} fill="#f1f5f9" />
          <rect x={x + 21.6} y={y + 29.4} width={18.8} height={2.4} rx={1.1} fill="#94a3b8" opacity={0.7} />
          <circle cx={x + 8.6} cy={y + 30} r={1.2} fill="#ef4444" />
          <text x={x + 5.6} y={y + 21} fontSize={2.4} fill="#475569" fontFamily="monospace">
            iC60N C16
          </text>

          {/* 三相铜导线接到接触器 */}
          {[0, 1, 2].map((i) => (
            <rect key={`w-${i}`} x={x + 11 + i * 15} y={y + 42} width={1.5} height={4.4} fill="#c2833c" />
          ))}

          {/* 交流接触器 */}
          <rect x={x + 5.6} y={y + 47} width={52} height={26} rx={1} fill="url(#pdevice)" stroke="#7d8794" strokeWidth={0.45} />
          <rect x={x + 5.6} y={y + 47} width={52} height={1} fill="#ffffff" opacity={0.9} />
          {[0, 1, 2].map((i) => (
            <g key={`c-pole-${i}`}>
              <rect x={x + 10 + i * 15} y={y + 48.6} width={6} height={8} rx={0.5} fill="#cbd4dd" stroke="#8d98a4" strokeWidth={0.25} />
              <rect x={x + 10 + i * 15} y={y + 62.4} width={6} height={7} rx={0.5} fill="#cbd4dd" stroke="#8d98a4" strokeWidth={0.25} />
            </g>
          ))}
          <rect x={x + 24} y={y + 56.4} width={14} height={5} rx={0.8} fill="#475569" />
          <text x={x + 5.6} y={y + 71.4} fontSize={2.3} fill="#475569" fontFamily="monospace">
            KM AC-3 40A
          </text>

          {/* 右侧：环形 CT + 端子排 */}
          <circle cx={x + w - 24} cy={y + 26} r={10} fill="url(#pdevice)" stroke="#6b7280" strokeWidth={0.6} />
          <circle cx={x + w - 24} cy={y + 26} r={4.2} fill="#2b323b" stroke="#111827" strokeWidth={0.4} />
          <rect x={x + w - 37} y={y + 24.7} width={26} height={2.6} fill="#c2833c" opacity={0.9} />
          {[0, 1, 2].map((i) => (
            <circle key={`ct-t-${i}`} cx={x + w - 31.4 + i * 2.6} cy={y + 39} r={1.1} fill="url(#pscrew)" stroke="#6b7280" strokeWidth={0.25} />
          ))}
          <text x={x + w - 24} y={y + 41.4} textAnchor="middle" fontSize={2.2} fill="#475569" fontFamily="monospace">
            CT 100/5
          </text>

          {/* 右侧端子排 */}
          <rect x={x + w - 47} y={y + 47} width={42} height={16} rx={0.8} fill="#5b6472" stroke="#39414d" strokeWidth={0.35} />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={`tb-${i}`}>
              <rect x={x + w - 45 + i * 8.2} y={y + 49} width={6.6} height={12} rx={0.5} fill="#8d98a4" stroke="#4b5563" strokeWidth={0.2} />
              <Screw gradientId="pscrew" cx={x + w - 41.7 + i * 8.2} cy={y + 55} r={1.2} />
            </g>
          ))}

          {/* 带电指示灯 + N/PE 标识 */}
          <circle cx={x + 8} cy={y + 80} r={1.7} fill="url(#pled_g)" stroke="#166534" strokeWidth={0.2} />
          <text x={x + 12} y={y + 81.2} fontSize={2.3} fill="#475569" fontFamily="monospace">
            LIVE · N / PE
          </text>
          <rect x={x + w - 34} y={y + 76} width={29} height={1.6} rx={0.6} fill="#16a34a" opacity={0.8} />
          <rect x={x + w - 34} y={y + 77.6} width={29} height={1.6} rx={0.6} fill="#facc15" opacity={0.8} />
        </g>
      );
    default:
      return <rect x={x} y={y} width={w} height={h} rx={1.6} fill="url(#ppanel)" stroke="#0b1220" strokeWidth={0.6} />;
  }
}

const LINE = "#475569";

function SystemDiagram() {
  return (
    <g>
      <text x={48} y={144} fontSize={7.6} fontWeight={600} fill="#64748b" letterSpacing="0.7">
        POWER DISTRIBUTION SINGLE-LINE DIAGRAM
      </text>
      <text x={48} y={155} fontSize={6.2} fill="#94a3b8">
        400V / 3P+N+PE / 50Hz · 1250 kVA transformer · ACB 2000A · main busbar 2500A
      </text>

      <line x1={52} y1={186} x2={300} y2={186} stroke={LINE} strokeWidth={1.3} />

      <circle cx={72} cy={186} r={15} fill="#ffffff" stroke={LINE} strokeWidth={1.2} />
      <circle cx={72} cy={186} r={8.6} fill="none" stroke={LINE} strokeWidth={0.8} />
      <text x={72} y={189} textAnchor="middle" fontSize={6} fill={LINE}>
        T
      </text>
      <text x={72} y={212} textAnchor="middle" fontSize={5.8} fontWeight={600} fill="#334155">
        1250 kVA
      </text>
      <text x={72} y={221} textAnchor="middle" fontSize={5.2} fill="#64748b">
        10 / 0.4 kV
      </text>

      {[0, 1, 2].map((i) => (
        <line key={i} x1={104 + i * 9} y1={181} x2={109 + i * 9} y2={191} stroke={LINE} strokeWidth={0.9} />
      ))}

      <rect x={154} y={172} width={36} height={28} rx={2} fill="#ffffff" stroke={LINE} strokeWidth={1.2} />
      <line x1={161} y1={191} x2={183} y2={178} stroke={LINE} strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={161} cy={191} r={1.7} fill={LINE} />
      <circle cx={183} cy={178} r={1.7} fill={LINE} />
      <text x={172} y={215} textAnchor="middle" fontSize={5.8} fontWeight={600} fill="#334155">
        ACB 2000A
      </text>
      <text x={172} y={224} textAnchor="middle" fontSize={5.2} fill="#64748b">
        3P · Icu 65kA
      </text>

      <circle cx={216} cy={186} r={6.6} fill="#ffffff" stroke={LINE} strokeWidth={1} />
      <circle cx={230} cy={186} r={6.6} fill="#ffffff" stroke={LINE} strokeWidth={1} />
      <text x={223} y={215} textAnchor="middle" fontSize={5.6} fill="#334155">
        CT 2000/5A
      </text>
      <text x={223} y={224} textAnchor="middle" fontSize={5} fill="#64748b">
        0.5 / 5P10
      </text>

      <line x1={262} y1={186} x2={262} y2={224} stroke={LINE} strokeWidth={1} />
      <rect x={246} y={224} width={32} height={22} rx={2} fill="#ffffff" stroke={LINE} strokeWidth={1} />
      <text x={262} y={239} textAnchor="middle" fontSize={6.4} fill="#334155" fontFamily="monospace">
        kWh
      </text>
      <circle cx={281} cy={228} r={3.1} fill="#dc2626" />
      <text x={262} y={258} textAnchor="middle" fontSize={5} fill="#64748b">
        0.2S · utility sealed
      </text>

      <line x1={300} y1={186} x2={1096} y2={186} stroke="#c2833c" strokeWidth={5} strokeLinecap="round" />
      <line x1={300} y1={184.4} x2={1096} y2={184.4} stroke="#f0c894" strokeWidth={1.3} strokeLinecap="round" />
      <path d="M 1096 186 L 1087 181.2 L 1087 190.8 Z" fill="#c2833c" />
      <text x={300} y={176} fontSize={5.8} fontWeight={700} fill="#92400e">
        MAIN BUSBAR 2500A (L1 / L2 / L3 / N)
      </text>

      <line x1={420} y1={186} x2={420} y2={206} stroke={LINE} strokeWidth={1} />
      <circle cx={420} cy={201} r={2.4} fill="#ffffff" stroke={LINE} strokeWidth={0.9} />
      <rect x={360} y={206} width={190} height={44} rx={4} fill="#fff5f5" stroke="#fca5a5" strokeDasharray="3 2" strokeWidth={0.8} />
      <text x={455} y={219} textAnchor="middle" fontSize={6} fontWeight={700} fill="#991b1b">
        CAPACITOR BANK 4 × 60 kvar
      </text>
      <text x={455} y={229} textAnchor="middle" fontSize={5.2} fill="#7f1d1d">
        fuse · contactor · 7% reactor · capacitor
      </text>
      <text x={455} y={239} textAnchor="middle" fontSize={5.2} fill="#b45309">
        PF controller · local compensation
      </text>

      {[700, 760, 820, 880, 940, 1000].map((bx) => (
        <g key={bx}>
          <line x1={bx} y1={186} x2={bx} y2={206} stroke={LINE} strokeWidth={1} />
          <rect x={bx - 6} y={206} width={12} height={10} rx={1} fill="#ffffff" stroke={LINE} strokeWidth={0.9} />
          <line x1={bx} y1={216} x2={bx} y2={227} stroke={LINE} strokeWidth={1} />
          <path d={`M ${bx - 3.2} 225 L ${bx + 3.2} 225 L ${bx} 231 Z`} fill={LINE} />
        </g>
      ))}
      <text x={850} y={244} textAnchor="middle" fontSize={5.4} fill="#334155">
        OUTGOING FEEDERS · 4 drawer + 4 fixed
      </text>
      <text x={850} y={253} textAnchor="middle" fontSize={5} fill="#64748b">
        MCCB / MCCB + contactor → loads
      </text>
      <text x={1096} y={222} textAnchor="end" fontSize={5.4} fill="#92400e" fontWeight={600}>
        TO LOADS
      </text>
    </g>
  );
}

function CabinetView({
  cab,
  hovered,
  onHover,
}: {
  cab: CabinetSpec;
  hovered: string | null;
  onHover: (key: string | null) => void;
}) {
  const slots = layoutLabels(cab, LABEL_CFG);
  const tint = HEADER_TINT[cab.accent] ?? "#eef2f7";
  const tintText = HEADER_TEXT[cab.accent] ?? "#334155";

  return (
    <g>
      {/* 柜外引线（走柜顶 / 柜底走廊，柜体绘制时被遮挡） */}
      {slots.map((s) => {
        const px = Math.min(cab.x + CAB_W - 13, Math.max(cab.x + 13, s.part.x + s.part.w / 2));
        const sx = s.x + 8;
        const active = hovered === s.part.key;
        const d = s.above
          ? `M ${sx} ${s.y + PILL_H} L ${sx} ${CORRIDOR_TOP} L ${px} ${CORRIDOR_TOP} L ${px} ${CAB_TOP}`
          : `M ${sx} ${s.y} L ${sx} ${CORRIDOR_BOTTOM} L ${px} ${CORRIDOR_BOTTOM} L ${px} ${CAB_BOTTOM}`;
        return (
          <g key={s.label.part}>
            <path
              d={d}
              fill="none"
              stroke={active ? cab.accent : "#94a3b8"}
              strokeWidth={active ? 1.7 : 0.7}
              opacity={active ? 1 : 0.7}
              strokeLinejoin="round"
            />
            <circle cx={px} cy={s.above ? CORRIDOR_TOP : CORRIDOR_BOTTOM} r={active ? 2.4 : 1.6} fill={cab.accent} opacity={active ? 1 : 0.7} />
          </g>
        );
      })}

      {/* 柜体 —— 分层立体结构 */}
      <g>
        {/* 地面阴影 */}
        <ellipse cx={cab.x + CAB_W / 2} cy={CAB_BOTTOM + 6} rx={CAB_W * 0.48} ry={5.5} fill="#0f172a" opacity={0.18} />

        {/* 后侧板 / 深灰底座（比前面板略大一圈，衬出立体感） */}
        <rect
          x={cab.x - 1.6}
          y={CAB_TOP - 1.2}
          width={CAB_W + 3.2}
          height={CAB_H + 2.4}
          rx={4}
          fill="url(#psiderail)"
          stroke="#4b5563"
          strokeWidth={0.8}
        />

        {/* 前面板（主色） */}
        <rect x={cab.x} y={CAB_TOP} width={CAB_W} height={CAB_H} rx={3} fill="url(#pcab)" stroke="#6b7480" strokeWidth={0.9} />
        <rect x={cab.x + 4} y={CAB_TOP + 2} width={CAB_W - 8} height={1.2} rx={0.6} fill="#ffffff" opacity={0.8} />
        {/* 左右侧板的窄阴影（制造面板厚度感） */}
        <rect x={cab.x} y={CAB_TOP} width={4} height={CAB_H} fill="#0f172a" opacity={0.08} />
        <rect x={cab.x + CAB_W - 4} y={CAB_TOP} width={4} height={CAB_H} fill="#0f172a" opacity={0.05} />

        {/* 顶部顶板（比前面板略突出） */}
        <rect
          x={cab.x - 3}
          y={CAB_TOP - 4}
          width={CAB_W + 6}
          height={4}
          rx={1}
          fill="url(#ptopcover)"
          stroke="#4b5563"
          strokeWidth={0.6}
        />
        <rect x={cab.x - 3} y={CAB_TOP - 4} width={CAB_W + 6} height={0.8} fill="#ffffff" opacity={0.55} />

        {/* 顶部通风百叶（2 组，每组 5 片） */}
        {[0, 1].map((i) => (
          <g key={`vent-${i}`}>
            <rect
              x={cab.x + 20 + i * 62}
              y={CAB_TOP - 3.6}
              width={46}
              height={3.6}
              rx={0.8}
              fill="#2c3440"
              stroke="#141a22"
              strokeWidth={0.4}
            />
            {[0, 1, 2, 3, 4].map((k) => (
              <rect
                key={k}
                x={cab.x + 22 + i * 62 + k * 8.6}
                y={CAB_TOP - 3}
                width={6.6}
                height={2.2}
                rx={0.5}
                fill="#0b1220"
              />
            ))}
          </g>
        ))}

        {/* 底部基础槽钢 */}
        <rect
          x={cab.x - 4}
          y={CAB_BOTTOM + 1}
          width={CAB_W + 8}
          height={5.5}
          rx={1}
          fill="#4b5563"
          stroke="#2c3440"
          strokeWidth={0.6}
        />
        <rect x={cab.x - 3} y={CAB_BOTTOM + 1.2} width={CAB_W + 6} height={1} fill="#9aa5b1" opacity={0.7} />
        {/* 地脚螺栓（前侧两颗） */}
        {[cab.x + 8, cab.x + CAB_W - 8].map((fx) => (
          <g key={`anchor-${fx}`}>
            <circle cx={fx} cy={CAB_BOTTOM + 7.2} r={1.7} fill="url(#pscrew)" stroke="#334155" strokeWidth={0.5} />
            <circle cx={fx} cy={CAB_BOTTOM + 7.2} r={0.7} fill="#4b5563" />
          </g>
        ))}

        {/* 四角固定螺丝（前面板） */}
        {[
          { x: cab.x + 4, y: CAB_TOP + 4 },
          { x: cab.x + CAB_W - 4, y: CAB_TOP + 4 },
          { x: cab.x + 4, y: CAB_BOTTOM - 4 },
          { x: cab.x + CAB_W - 4, y: CAB_BOTTOM - 4 },
        ].map((pt, i) => (
          <g key={`corner-${i}`}>
            <circle cx={pt.x} cy={pt.y} r={1.5} fill="url(#pscrew)" stroke="#475569" strokeWidth={0.4} />
            <circle cx={pt.x} cy={pt.y} r={0.55} fill="#475569" />
          </g>
        ))}

        {/* 顶部标题色带 */}
        <rect x={cab.x + 3} y={CAB_TOP + 3} width={CAB_W - 6} height={34} rx={2} fill={tint} />
        <rect x={cab.x + 4} y={CAB_TOP + 3.6} width={CAB_W - 8} height={0.8} fill="#ffffff" opacity={0.7} />
        {/* 色带下沿折边 */}
        <rect x={cab.x + 3} y={CAB_TOP + 36} width={CAB_W - 6} height={1.2} fill={cab.accent} opacity={0.6} />
        <rect x={cab.x + 3} y={CAB_TOP + 37.2} width={CAB_W - 6} height={0.6} fill="#0f172a" opacity={0.12} />

        {/* 居中：标题 + 规格 */}
        <text
          x={cab.x + CAB_W / 2}
          y={CAB_TOP + 16.5}
          textAnchor="middle"
          fontSize={10.4}
          fontWeight={700}
          fill={tintText}
          letterSpacing="0.2"
        >
          {cab.title}
        </text>
        <text x={cab.x + CAB_W / 2} y={CAB_TOP + 28.5} textAnchor="middle" fontSize={6.3} fill={tintText} opacity={0.72}>
          {cab.subtitle}
        </text>

        {/* 安装板 —— 镀锌斜纹底 + 深色边框 */}
        <rect
          x={cab.x + 9}
          y={CAB_TOP + 41}
          width={CAB_W - 18}
          height={CAB_H - 50}
          rx={1.2}
          fill="#dfe5ec"
          stroke="#9aa5b1"
          strokeWidth={0.5}
        />
        <rect
          x={cab.x + 10}
          y={CAB_TOP + 42}
          width={CAB_W - 20}
          height={CAB_H - 52}
          rx={1}
          fill="url(#pgavanize)"
          stroke="#cbd5e1"
          strokeWidth={0.3}
        />
        {/* 柜体开口上下暗角，增强纵深感 */}
        <rect x={cab.x + 10} y={CAB_TOP + 42} width={CAB_W - 20} height={22} fill="url(#pcabVignetteTop)" />
        <rect x={cab.x + 10} y={CAB_BOTTOM - 32} width={CAB_W - 20} height={24} fill="url(#pcabVignetteBottom)" />
        <rect x={cab.x + 10} y={CAB_TOP + 42} width={14} height={CAB_H - 52} fill="url(#pcabVignetteLeft)" />
        <rect x={cab.x + CAB_W - 24} y={CAB_TOP + 42} width={14} height={CAB_H - 52} fill="url(#pcabVignetteRight)" />
        {/* 安装板顶部横带（区分安装区） */}
        <rect
          x={cab.x + 10}
          y={CAB_TOP + 42}
          width={CAB_W - 20}
          height={2}
          fill="#94a3b8"
          opacity={0.4}
        />

        {/* 左右 C 型钢 DIN 导轨 */}
        {[
          { x: cab.x + 6 },
          { x: cab.x + CAB_W - 10 },
        ].map((r, i) => (
          <g key={`rail-${i}`}>
            <rect x={r.x} y={CAB_TOP + 43} width={4} height={CAB_H - 58} fill="#4b5563" />
            <rect x={r.x + 0.3} y={CAB_TOP + 43.6} width={3.4} height={CAB_H - 59.2} fill="#374151" />
            {/* 内侧 C 形槽口 */}
            <rect
              x={i === 0 ? r.x + 3 : r.x}
              y={CAB_TOP + 46}
              width={1.4}
              height={CAB_H - 64}
              fill="#0f172a"
              opacity={0.85}
            />
            {/* 定位孔（每 32mm 一个） */}
            {Array.from({ length: Math.floor((CAB_H - 60) / 32) }).map((_, k) => (
              <circle
                key={k}
                cx={r.x + 2}
                cy={CAB_TOP + 60 + k * 32}
                r={0.9}
                fill="#cbd5e1"
                stroke="#475569"
                strokeWidth={0.2}
              />
            ))}
          </g>
        ))}

        {/* 安装板底部 PE 排安装凹槽（虚线框） */}
        <rect
          x={cab.x + 10}
          y={CAB_BOTTOM - 18}
          width={CAB_W - 20}
          height={10}
          rx={1}
          fill="#1f2937"
          opacity={0.1}
          stroke="#94a3b8"
          strokeWidth={0.35}
          strokeDasharray="2 1"
        />

        {/* 混合出线柜功能分隔隔板（Form 3b：左抽屉半 + 右开放半 物理隔离）—— 半透明，不遮挡内部元器件 */}
        {cab.id === "outgoing" ? (
          <g opacity={0.28}>
            <rect
              x={cab.x + CAB_W / 2 - 5}
              y={CAB_TOP + 42}
              width={10}
              height={CAB_H - 52}
              rx={2}
              fill="url(#ppanel)"
              stroke="#0b1220"
              strokeWidth={0.5}
            />
            <rect x={cab.x + CAB_W / 2 - 5} y={CAB_TOP + 42} width={10} height={1} fill="#94a3b8" opacity={0.5} />
            <rect x={cab.x + CAB_W / 2 - 5} y={CAB_BOTTOM - 20} width={10} height={1} fill="#0b1220" opacity={0.4} />
            {[CAB_TOP + 56, CAB_TOP + 180, CAB_TOP + 300, CAB_TOP + 420, CAB_BOTTOM - 34].map((sy) => (
              <g key={sy}>
                <circle cx={cab.x + CAB_W / 2} cy={sy} r={1.8} fill="url(#pscrew)" stroke="#334155" strokeWidth={0.3} />
              </g>
            ))}
            {/* 警示色标签 */}
            <rect x={cab.x + CAB_W / 2 - 4} y={CAB_TOP + 48} width={8} height={18} rx={0.8} fill="url(#pwarn)" stroke="#7c2d12" strokeWidth={0.3} />
          </g>
        ) : null}
        {cab.id === "outgoing" ? (
          <g opacity={0.95}>
            {/* 左右半区标识（在分隔板上层，保持清晰） */}
            <text x={cab.x + 24} y={CAB_TOP + 56} fontSize={4.2} fontWeight={700} fill="#b45309" fontFamily="monospace">
              ◂ DRAWER HALF
            </text>
            <text x={cab.x + CAB_W - 24} y={CAB_TOP + 56} textAnchor="end" fontSize={4.2} fontWeight={700} fill="#b45309" fontFamily="monospace">
              OPEN HALF ▸
            </text>
          </g>
        ) : null}
      </g>

      {/* 柜内引线 */}
      {slots.map((s) => {
        const px = Math.min(cab.x + CAB_W - 13, Math.max(cab.x + 13, s.part.x + s.part.w / 2));
        const active = hovered === s.part.key;
        const d = s.above
          ? `M ${px} ${CAB_TOP + 40} L ${px} ${s.part.y - 2.5}`
          : `M ${px} ${CAB_BOTTOM - 8} L ${px} ${s.part.y + s.part.h + 2.5}`;
        const ty = s.above ? s.part.y - 3.6 : s.part.y + s.part.h + 3.6;
        return (
          <g key={s.label.part}>
            <path
              d={d}
              fill="none"
              stroke={active ? cab.accent : "#94a3b8"}
              strokeWidth={active ? 1.4 : 0.7}
              opacity={active ? 1 : 0.7}
            />
            <circle cx={px} cy={ty} r={active ? 2.4 : 1.6} fill={cab.accent} opacity={active ? 1 : 0.7} />
          </g>
        );
      })}

      {/* 元器件 */}
      {[...cab.parts]
        .sort((a, b) => Number(a.key === hovered) - Number(b.key === hovered))
        .map((p) => {
          const label = cab.labels.find((l) => l.part === p.key);
          const active = hovered === p.key;
          const body = (
            <g
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                transform: active ? "scale(1.06)" : "scale(1)",
                transition: "transform 160ms ease",
              }}
            >
              {active ? (
                <g pointerEvents="none">
                  <rect x={p.x - 3} y={p.y - 3} width={p.w + 6} height={p.h + 6} rx={3} fill={cab.accent} opacity={0.3} filter="url(#pglow)" />
                  <rect
                    x={p.x - 1.4}
                    y={p.y - 1.4}
                    width={p.w + 2.8}
                    height={p.h + 2.8}
                    rx={2.6}
                    fill="none"
                    stroke={cab.accent}
                    strokeWidth={1.3}
                  />
                </g>
              ) : null}
              <ellipse
                cx={p.x + p.w / 2}
                cy={p.y + p.h + 2.4}
                rx={p.w * 0.5}
                ry={2.6}
                fill="#0f172a"
                opacity={0.18}
              />
              <PartShape part={p} />
              <PartShade x={p.x} y={p.y} w={p.w} h={p.h} rx={1.6} />
            </g>
          );
          return label ? (
            <a
              key={p.key}
              href="/category/electrical"
              aria-label={label.text}
              className="cursor-pointer"
              onMouseEnter={() => onHover(p.key)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(p.key)}
              onBlur={() => onHover(null)}
            >
              <title>{label.text}</title>
              {body}
            </a>
          ) : (
            <g key={p.key}>{body}</g>
          );
        })}

      {/* 名称标签 */}
      {slots.map((s) => {
        const active = hovered === s.part.key;
        const pillW = Math.min(126, s.label.text.length * 4.8 + 14);
        return (
          <a
            key={s.label.part}
            href="/category/electrical"
            aria-label={s.label.text}
            className="cursor-pointer"
            onMouseEnter={() => onHover(s.part.key)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(s.part.key)}
            onBlur={() => onHover(null)}
          >
            <rect
              x={s.x}
              y={s.y}
              width={pillW}
              height={PILL_H}
              rx={6}
              fill={active ? cab.accent : (HEADER_TINT[cab.accent] ?? "#e2e8f0")}
              stroke={cab.accent}
              strokeWidth={active ? 1.3 : 0.7}
              opacity={active ? 1 : 0.95}
            />
            <text x={s.x + 7} y={s.y + 9.3} fontSize={8.2} fontWeight={active ? 700 : 500} fill={active ? "#ffffff" : (HEADER_TEXT[cab.accent] ?? "#0f172a")}>
              {s.label.text}
            </text>
          </a>
        );
      })}
    </g>
  );
}

export default function DistributionDiagram() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <svg
      role="img"
      aria-label="Low-voltage power distribution cabinet lineup: incoming, metering, power factor compensation and mixed outgoing cabinets"
      viewBox={`0 ${VIEW_TOP} 1148 ${VIEW_H}`}
      className="h-auto w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pcopper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6d7a6" />
          <stop offset="0.45" stopColor="#dda45c" />
          <stop offset="1" stopColor="#b97b31" />
        </linearGradient>
        <linearGradient id="palu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbfcfd" />
          <stop offset="0.4" stopColor="#e2e8ee" />
          <stop offset="1" stopColor="#b7c1cc" />
        </linearGradient>
        <linearGradient id="pgrey" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7f9fb" />
          <stop offset="0.45" stopColor="#e2e8ee" />
          <stop offset="1" stopColor="#c3ccd6" />
        </linearGradient>
        <linearGradient id="plight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#f2f5f9" />
          <stop offset="1" stopColor="#dbe3eb" />
        </linearGradient>
        <linearGradient id="pwhite" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#e8edf3" />
        </linearGradient>
        <linearGradient id="pdark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#59636f" />
          <stop offset="0.5" stopColor="#374151" />
          <stop offset="1" stopColor="#1b2430" />
        </linearGradient>
        <linearGradient id="pmetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6ebf0" />
          <stop offset="0.5" stopColor="#c3ccd6" />
          <stop offset="1" stopColor="#98a3b0" />
        </linearGradient>
        <linearGradient id="pcab" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d7dee5" />
          <stop offset="0.28" stopColor="#e9edf2" />
          <stop offset="0.78" stopColor="#ccd5de" />
          <stop offset="1" stopColor="#b6c0cb" />
        </linearGradient>
        <linearGradient id="pshade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.24" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="0.78" stopColor="#0f172a" stopOpacity="0.03" />
          <stop offset="1" stopColor="#0f172a" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="pside" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0f172a" stopOpacity="0.12" />
          <stop offset="0.16" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="0.84" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="1" stopColor="#0f172a" stopOpacity="0.14" />
        </linearGradient>
        <radialGradient id="pscrew" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#d3dbe3" />
          <stop offset="1" stopColor="#94a3b8" />
        </radialGradient>
        <linearGradient id="pchrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.42" stopColor="#e6ebf0" />
          <stop offset="0.7" stopColor="#b9c3cd" />
          <stop offset="1" stopColor="#8d98a4" />
        </linearGradient>
        <linearGradient id="plcd" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12362c" />
          <stop offset="0.45" stopColor="#0a211c" />
          <stop offset="1" stopColor="#06120f" />
        </linearGradient>
        <linearGradient id="pcoil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0b673" />
          <stop offset="0.4" stopColor="#d08a3c" />
          <stop offset="1" stopColor="#a3611f" />
        </linearGradient>
        <linearGradient id="plam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2e8ee" />
          <stop offset="1" stopColor="#9aa5b1" />
        </linearGradient>
        <radialGradient id="pgloss" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="0.42" stopColor="#e9eef4" />
          <stop offset="1" stopColor="#c8d1db" />
        </linearGradient>
        <linearGradient id="pdevice" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f6f9" />
          <stop offset="0.48" stopColor="#d8dee6" />
          <stop offset="1" stopColor="#a9b3bf" />
        </linearGradient>
        <filter id="psoft" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0.8" dy="1.3" stdDeviation="1" floodColor="#0b1220" floodOpacity="0.38" />
        </filter>
        <filter id="pglow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <linearGradient id="pcabVignetteTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f172a" stopOpacity="0.2" />
          <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pcabVignetteBottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f172a" stopOpacity="0" />
          <stop offset="1" stopColor="#0f172a" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="pcabVignetteLeft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0f172a" stopOpacity="0.16" />
          <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pcabVignetteRight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0f172a" stopOpacity="0" />
          <stop offset="1" stopColor="#0f172a" stopOpacity="0.16" />
        </linearGradient>
        {/* 实物图仅外缘渐隐透明，保留产品主体清晰 */}
        <radialGradient id="fadeAll" cx="50%" cy="50%" r="50%">
          <stop offset="0.85" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <mask id="prodFade" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
          <rect x="0" y="0" width="1" height="1" fill="url(#fadeAll)" />
        </mask>

        {/* 安装板镀锌斜纹 */}
        <pattern id="pgavanize" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="6" height="6" fill="#eef2f6" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#d9e0e8" strokeWidth="0.5" opacity="0.7" />
          <line x1="3" y1="0" x2="3" y2="6" stroke="#f6f9fc" strokeWidth="0.4" opacity="0.8" />
        </pattern>

        {/* 柜体侧板 / 顶板 / 底板的深灰 */}
        <linearGradient id="psiderail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6b7480" />
          <stop offset="0.4" stopColor="#86909c" />
          <stop offset="1" stopColor="#5a6370" />
        </linearGradient>
        <linearGradient id="ptopcover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8f98a3" />
          <stop offset="0.35" stopColor="#a2acb7" />
          <stop offset="1" stopColor="#5a6370" />
        </linearGradient>
        <linearGradient id="pvent" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f4651" />
          <stop offset="0.5" stopColor="#1c232d" />
          <stop offset="1" stopColor="#3f4651" />
        </linearGradient>
        <linearGradient id="pnameplate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6f8fa" />
          <stop offset="0.5" stopColor="#dde3ea" />
          <stop offset="1" stopColor="#bcc5cf" />
        </linearGradient>

        {/* 工业风设计令牌 */}
        {/* 深色金属外壳（断路器、控制器、抽屉面板底） */}
        <linearGradient id="ppanel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a424d" />
          <stop offset="0.45" stopColor="#232a34" />
          <stop offset="1" stopColor="#12171d" />
        </linearGradient>
        {/* 警示琥珀 */}
        <radialGradient id="pwarn" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="0.55" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </radialGradient>
        {/* 安全绿 LED */}
        <radialGradient id="pled_g" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="0.45" stopColor="#22c55e" />
          <stop offset="1" stopColor="#14532d" />
        </radialGradient>
        {/* 故障红 LED */}
        <radialGradient id="pled_r" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fecaca" />
          <stop offset="0.45" stopColor="#ef4444" />
          <stop offset="1" stopColor="#7f1d1d" />
        </radialGradient>
        {/* 运行绿 LED */}
        <radialGradient id="pled_rn" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.45" stopColor="#eab308" />
          <stop offset="1" stopColor="#713f12" />
        </radialGradient>
        {/* 金属拉丝面板（控制器前面） */}
        <linearGradient id="pbrushed" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a323c" />
          <stop offset="0.15" stopColor="#3a424d" />
          <stop offset="0.4" stopColor="#2e3640" />
          <stop offset="0.7" stopColor="#3a424d" />
          <stop offset="1" stopColor="#1e252d" />
        </linearGradient>
      </defs>

      <rect x={0} y={VIEW_TOP} width={1148} height={VIEW_H} fill="#ffffff" />
      <SystemDiagram />
      {CABINETS.map((c) => (
        <CabinetView key={c.id} cab={c} hovered={hovered} onHover={setHovered} />
      ))}
    </svg>
  );
}

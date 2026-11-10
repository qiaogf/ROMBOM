"use client";

import { useState } from "react";
import { layoutLabels, Led, Screw, type LabelLayoutConfig } from "./cabinet-shared";

type Kind =
  | "fan"
  | "stat"
  | "breaker"
  | "mccb"
  | "contactor"
  | "relay"
  | "rack"
  | "module"
  | "power"
  | "terminal"
  | "duct"
  | "rail"
  | "lug"
  | "drive"
  | "servo"
  | "transformer"
  | "filter"
  | "meter"
  | "ups"
  | "switch"
  | "socket"
  | "motor"
  | "sensor"
  | "stack"
  | "hmi"
  | "button";

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
  href: string;
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
const CAB_W = 240;
const CAB_H = 620;
const CAB_BOTTOM = CAB_TOP + CAB_H;
const LABEL_STEP = 20;
const LABEL_COL_W = 118;
const LABEL_GAP_TOP = 16;
const LABEL_GAP_BOTTOM = 22;
const PILL_H = 12;
const MID_Y = CAB_TOP + CAB_H / 2;
const VIEW_TOP = 232;
const VIEW_H = 950;

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

// 参考图风格：浅色标题带 + 深色标题字
const HEADER_TINT: Record<string, string> = {
  "#0284c7": "#dbeafe",
  "#16a34a": "#dcfce7",
  "#7c3aed": "#ede9fe",
  "#ea580c": "#ffedd5",
};

const HEADER_TEXT: Record<string, string> = {
  "#0284c7": "#1e40af",
  "#16a34a": "#166534",
  "#7c3aed": "#5b21b6",
  "#ea580c": "#9a3412",
};

const NO_SHADE: Kind[] = ["motor", "stack", "sensor", "rail"];
const SHADE_RX: Partial<Record<Kind, number>> = {
  duct: 0.8,
  hmi: 2.4,
  fan: 3,
  mccb: 2,
  contactor: 2,
  drive: 2,
  servo: 2,
  ups: 2,
  stat: 2.2,
};

// 按层布局：同一层内的元器件上下居中对齐
function row(y: number, h: number, items: Array<Omit<Part, "y" | "h"> & { h?: number }>): Part[] {
  return items.map((it) => {
    const ih = it.h ?? h;
    return { key: it.key, kind: it.kind, x: it.x, w: it.w, h: ih, y: Math.round(y + (h - ih) / 2) };
  });
}

const CABINETS: CabinetSpec[] = [
  {
    id: "dcs",
    title: "DCS Cabinet",
    subtitle: "2000 × 800 × 600 · IP54",
    x: 16,
    accent: "#0284c7",
    parts: [
      ...row(452, 52, [
        { key: "dcs-fan1", kind: "fan", x: 36, w: 52 },
        { key: "dcs-stat", kind: "stat", x: 94, w: 44 },
        { key: "dcs-psu1", kind: "power", x: 146, w: 40 },
      ]),
      ...row(520, 42, [{ key: "dcs-mcb", kind: "breaker", x: 36, w: 200, h: 42 }]),
      ...row(584, 56, [{ key: "dcs-ctrl", kind: "rack", x: 36, w: 200 }]),
      ...row(660, 56, [{ key: "dcs-io", kind: "rack", x: 36, w: 200 }]),
      ...row(730, 38, [
        { key: "dcs-comm", kind: "module", x: 36, w: 100, h: 32 },
        { key: "dcs-iso", kind: "module", x: 144, w: 92, h: 32 },
      ]),
      ...row(782, 38, [
        { key: "dcs-spd", kind: "module", x: 36, w: 96, h: 32 },
        { key: "dcs-relay", kind: "relay", x: 140, w: 96, h: 24 },
      ]),
      ...row(834, 38, [
        { key: "dcs-tbase", kind: "terminal", x: 36, w: 110, h: 21 },
        { key: "dcs-lug", kind: "lug", x: 154, w: 82, h: 23 },
      ]),
      ...row(886, 12, [{ key: "dcs-duct", kind: "duct", x: 36, w: 200 }]),
      ...row(904, 34, [{ key: "dcs-term", kind: "terminal", x: 36, w: 200 }]),
      ...row(954, 10, [{ key: "dcs-pe", kind: "rail", x: 36, w: 200 }]),
      ...row(976, 12, [{ key: "dcs-gland", kind: "rail", x: 36, w: 200 }]),
    ],
    labels: [
      { part: "dcs-fan1", text: "Fans + Thermostat", href: "/category/electrical" },
      { part: "dcs-mcb", text: "Miniature CB (MCB)", href: "/category/electrical" },
      { part: "dcs-psu1", text: "24V Power Supply", href: "/category/electrical" },
      { part: "dcs-ctrl", text: "DCS Controller", href: "/category/control" },
      { part: "dcs-io", text: "AI/AO/DI/DO Cards", href: "/category/control" },
      { part: "dcs-comm", text: "DCS Comm Card", href: "/category/control" },
      { part: "dcs-iso", text: "Signal Isolators", href: "/category/control" },
      { part: "dcs-spd", text: "Signal SPD", href: "/category/electrical" },
      { part: "dcs-relay", text: "Relay + Socket", href: "/category/control" },
      { part: "dcs-tbase", text: "DCS Terminal Base", href: "/category/control" },
      { part: "dcs-lug", text: "Cable Lugs", href: "/category/electrical" },
      { part: "dcs-duct", text: "Duct / DIN Rail", href: "/category/electrical" },
      { part: "dcs-term", text: "Terminals + PE", href: "/category/electrical" },
    ],
  },
  {
    id: "plc",
    title: "PLC Cabinet",
    subtitle: "2000 × 800 × 600 · IP54",
    x: 308,
    accent: "#16a34a",
    parts: [
      ...row(452, 52, [
        { key: "plc-fan", kind: "fan", x: 328, w: 52 },
        { key: "plc-btn", kind: "button", x: 386, w: 112, h: 36 },
      ]),
      ...row(518, 40, [
        { key: "plc-mcbr", kind: "breaker", x: 328, w: 140, h: 42 },
        { key: "plc-psu1", kind: "power", x: 474, w: 40 },
      ]),
      ...row(572, 64, [
        { key: "plc-mccb", kind: "mccb", x: 328, w: 45, h: 58 },
        { key: "plc-mpcb", kind: "mccb", x: 382, w: 45, h: 58 },
        { key: "plc-cont", kind: "contactor", x: 432, w: 70, h: 58 },
      ]),
      ...row(648, 40, [
        { key: "plc-thermal", kind: "relay", x: 328, w: 80, h: 20 },
        { key: "plc-meter", kind: "meter", x: 432, w: 42 },
        { key: "plc-spd", kind: "module", x: 482, w: 42 },
      ]),
      ...row(700, 54, [{ key: "plc-cpu", kind: "rack", x: 328, w: 200 }]),
      ...row(766, 44, [{ key: "plc-di", kind: "rack", x: 328, w: 200 }]),
      ...row(822, 44, [{ key: "plc-ai", kind: "rack", x: 328, w: 200 }]),
      ...row(874, 30, [{ key: "plc-relay", kind: "relay", x: 328, w: 96, h: 24 }]),
      ...row(912, 12, [{ key: "plc-duct", kind: "duct", x: 328, w: 200 }]),
      ...row(930, 34, [{ key: "plc-term", kind: "terminal", x: 328, w: 200 }]),
      ...row(970, 8, [{ key: "plc-pe", kind: "rail", x: 328, w: 200 }]),
      ...row(980, 10, [{ key: "plc-gland", kind: "rail", x: 328, w: 200 }]),
      { key: "plc-hmi", kind: "hmi", x: 552, y: 646, w: 58, h: 44 },
      { key: "plc-stack", kind: "stack", x: 552, y: 338, w: 22, h: 96 },
      { key: "plc-sensor1", kind: "sensor", x: 552, y: 774, w: 48, h: 14 },
      { key: "plc-sensor2", kind: "sensor", x: 552, y: 800, w: 48, h: 14 },
    ],
    labels: [
      { part: "plc-stack", text: "Stack Light", href: "/category/control" },
      { part: "plc-mcbr", text: "Miniature CB (MCB)", href: "/category/electrical" },
      { part: "plc-fan", text: "Cooling Fan", href: "/category/electrical" },
      { part: "plc-btn", text: "Buttons / E-Stop", href: "/category/control" },
      { part: "plc-hmi", text: "HMI Touch Panel", href: "/category/control" },
      { part: "plc-mccb", text: "MCCB", href: "/category/electrical" },
      { part: "plc-mpcb", text: "Motor CB (MPCB)", href: "/category/electrical" },
      { part: "plc-cont", text: "AC Contactor", href: "/category/electrical" },
      { part: "plc-thermal", text: "Thermal Relay", href: "/category/electrical" },
      { part: "plc-meter", text: "Energy Meter", href: "/category/instrument-tool" },
      { part: "plc-spd", text: "Power SPD", href: "/category/electrical" },
      { part: "plc-psu1", text: "24V Power Supply", href: "/category/electrical" },
      { part: "plc-cpu", text: "PLC CPU + Memory", href: "/category/control" },
      { part: "plc-di", text: "DI / DO Modules", href: "/category/control" },
      { part: "plc-sensor1", text: "Prox / Photo Sensor", href: "/category/sensor" },
      { part: "plc-ai", text: "AI / AO Modules", href: "/category/control" },
      { part: "plc-relay", text: "Relay + Socket", href: "/category/control" },
      { part: "plc-duct", text: "Duct / DIN Rail", href: "/category/electrical" },
      { part: "plc-term", text: "Terminals + PE", href: "/category/electrical" },
    ],
  },
  {
    id: "comm",
    title: "Communication Cabinet",
    subtitle: "2000 × 800 × 600 · IP54",
    x: 600,
    accent: "#7c3aed",
    parts: [
      ...row(452, 52, [
        { key: "com-fan", kind: "fan", x: 620, w: 52 },
        { key: "com-mcb", kind: "breaker", x: 674, w: 146, h: 42 },
      ]),
      ...row(522, 64, [
        { key: "com-ups", kind: "ups", x: 620, w: 34 },
        { key: "com-psu1", kind: "power", x: 668, w: 40 },
      ]),
      ...row(604, 56, [{ key: "com-sw", kind: "switch", x: 620, w: 200 }]),
      ...row(678, 34, [{ key: "com-mod", kind: "module", x: 620, w: 200 }]),
      ...row(730, 34, [
        { key: "com-serial", kind: "module", x: 620, w: 96 },
        { key: "com-fiber", kind: "module", x: 726, w: 94 },
      ]),
      ...row(782, 34, [{ key: "com-gw", kind: "module", x: 620, w: 200 }]),
      ...row(832, 28, [{ key: "com-spd", kind: "module", x: 620, w: 200, h: 32 }]),
      ...row(872, 12, [{ key: "com-duct", kind: "duct", x: 620, w: 200 }]),
      ...row(890, 34, [{ key: "com-term", kind: "terminal", x: 620, w: 200 }]),
      ...row(950, 8, [{ key: "com-pe", kind: "rail", x: 620, w: 200 }]),
      ...row(976, 12, [{ key: "com-gland", kind: "rail", x: 620, w: 200 }]),
    ],
    labels: [
      { part: "com-mcb", text: "Miniature CB (MCB)", href: "/category/electrical" },
      { part: "com-fan", text: "Cooling Fan", href: "/category/electrical" },
      { part: "com-ups", text: "UPS", href: "/category/electrical" },
      { part: "com-psu1", text: "24V Power Supply", href: "/category/electrical" },
      { part: "com-sw", text: "Ethernet Switch", href: "/category/control" },
      { part: "com-mod", text: "Comm Modules", href: "/category/control" },
      { part: "com-serial", text: "Serial Server", href: "/category/control" },
      { part: "com-fiber", text: "Fiber Transceiver", href: "/category/control" },
      { part: "com-gw", text: "Gateway / DTU", href: "/category/control" },
      { part: "com-spd", text: "Signal SPD", href: "/category/electrical" },
      { part: "com-term", text: "Terminals + PE", href: "/category/electrical" },
      { part: "com-duct", text: "Duct / DIN Rail", href: "/category/electrical" },
    ],
  },
  {
    id: "drive",
    title: "Drive Cabinet",
    subtitle: "2000 × 800 × 600 · IP54",
    x: 892,
    accent: "#ea580c",
    parts: [
      ...row(452, 52, [
        { key: "drv-fan", kind: "fan", x: 912, w: 52 },
        { key: "drv-psu", kind: "power", x: 970, w: 40 },
        { key: "drv-mcb", kind: "breaker", x: 1040, w: 18, h: 42 },
      ]),
      ...row(518, 50, [
        { key: "drv-mccb", kind: "mccb", x: 912, w: 45, h: 58 },
        { key: "drv-cont", kind: "contactor", x: 960, w: 70, h: 58 },
        { key: "drv-thermal", kind: "relay", x: 1032, w: 80, h: 20 },
      ]),
      ...row(582, 124, [
        { key: "drv-vfd", kind: "drive", x: 912, w: 84 },
        { key: "drv-servo", kind: "servo", x: 1010, w: 66 },
      ]),
      ...row(720, 100, [
        { key: "drv-starter", kind: "drive", x: 912, w: 56 },
        { key: "drv-trafo", kind: "transformer", x: 1010, w: 88 },
      ]),
      ...row(834, 48, [
        { key: "drv-filter", kind: "filter", x: 912, w: 60 },
        { key: "drv-socket", kind: "socket", x: 984, w: 40 },
      ]),
      ...row(890, 12, [{ key: "drv-duct", kind: "duct", x: 912, w: 200 }]),
      ...row(908, 34, [{ key: "drv-term", kind: "terminal", x: 912, w: 200 }]),
      ...row(958, 8, [{ key: "drv-pe", kind: "rail", x: 912, w: 200 }]),
      ...row(978, 10, [{ key: "drv-gland", kind: "rail", x: 912, w: 200 }]),
      { key: "drv-motor", kind: "motor", x: 846, y: 623, w: 42, h: 42 },
    ],
    labels: [
      { part: "drv-mccb", text: "MCCB", href: "/category/electrical" },
      { part: "drv-cont", text: "AC Contactor", href: "/category/electrical" },
      { part: "drv-fan", text: "Cooling Fan", href: "/category/electrical" },
      { part: "drv-thermal", text: "Thermal Relay", href: "/category/electrical" },
      { part: "drv-mcb", text: "Miniature CB (MCB)", href: "/category/electrical" },
      { part: "drv-psu", text: "24V Power Supply", href: "/category/electrical" },
      { part: "drv-vfd", text: "VFD", href: "/category/drive" },
      { part: "drv-servo", text: "Servo Drive", href: "/category/drive" },
      { part: "drv-motor", text: "Servo Motor", href: "/category/drive" },
      { part: "drv-starter", text: "Soft Starter", href: "/category/drive" },
      { part: "drv-trafo", text: "Transformer", href: "/category/electrical" },
      { part: "drv-filter", text: "EMI Filter", href: "/category/electrical" },
      { part: "drv-socket", text: "DIN Rail Socket", href: "/category/electrical" },
      { part: "drv-term", text: "Terminals / Cables", href: "/category/electrical" },
    ],
  },
];

// 统一方向光：顶部高光 + 底部暗部 + 左右边缘明暗，让元器件有体积感
function PartShade({ x, y, w, h, rx = 1.6 }: { x: number; y: number; w: number; h: number; rx?: number }) {
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="url(#partSide)" />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="url(#partShade)" />
      <rect x={x + rx * 0.7} y={y + h - 1.15} width={w - rx * 1.4} height={0.6} rx={0.3} fill="#0f172a" opacity={0.16} />
      <path
        d={`M${x + rx + 0.4} ${y + 0.5} H${x + w - rx - 0.4}`}
        stroke="#ffffff"
        strokeWidth={0.7}
        strokeLinecap="round"
        opacity={0.62}
        fill="none"
      />
    </g>
  );
}

// 元器件实物贴图（public/images/components/*.webp），SVG 布局坐标保持不变
const PART_IMAGE: Record<Kind, string> = {
  fan: "fan-120",
  stat: "stat-thermostat",
  breaker: "mcb-1p",
  mccb: "mccb",
  contactor: "contactor",
  relay: "relay-socket",
  rack: "plc-rack",
  module: "din-module",
  power: "power-lrs",
  terminal: "terminal-block",
  duct: "wiring-duct",
  rail: "din-rail",
  lug: "cable-lug",
  drive: "drive-vfd",
  servo: "servo-drive",
  transformer: "transformer",
  filter: "emc-filter",
  meter: "panel-meter",
  ups: "ups-unit",
  switch: "eth-switch",
  socket: "din-socket",
  motor: "servo-motor",
  sensor: "prox-sensor",
  stack: "stack-light",
  hmi: "hmi-panel",
  button: "push-buttons",
};

// 各元器件实物图的真实宽高比（用于判断是否裁切）
const KIND_RATIO: Partial<Record<Kind, number>> = {
  fan: 1, stat: 1.33, breaker: 1.78, mccb: 0.75, contactor: 0.75,
  relay: 1.78, rack: 1.78, module: 1.33, power: 0.75, terminal: 1.78,
  duct: 1.78, rail: 1.78, lug: 1.33, drive: 0.75, servo: 0.75,
  transformer: 0.75, filter: 1.33, meter: 1, ups: 1.78, switch: 1.78,
  socket: 0.75, motor: 1.33, sensor: 1.33, stack: 0.56, hmi: 1.33, button: 1.33,
};

// 实物在产品照片中的归一化范围 [x, y, w, h]，用于裁掉四周大片留白
const CROP: Partial<Record<Kind, [number, number, number, number]>> = {
  fan: [0.167, 0.165, 0.667, 0.7],
  stat: [0.342, 0.318, 0.288, 0.461],
  breaker: [0.431, 0.188, 0.155, 0.683],
  mccb: [0.257, 0.255, 0.493, 0.539],
  contactor: [0, 0.186, 1, 0.679],
  relay: [0.108, 0.338, 0.785, 0.342],
  rack: [0.202, 0.246, 0.605, 0.512],
  module: [0.304, 0.241, 0.395, 0.512],
  power: [0.093, 0.232, 0.836, 0.571],
  terminal: [0.143, 0.396, 0.717, 0.25],
  duct: [0.403, 0.204, 0.195, 0.562],
  rail: [0.084, 0.488, 0.862, 0.075],
  lug: [0.103, 0.339, 0.808, 0.31],
  drive: [0.252, 0.13, 0.545, 0.739],
  servo: [0.357, 0.296, 0.26, 0.416],
  transformer: [0.205, 0.289, 0.626, 0.441],
  filter: [0.232, 0.161, 0.538, 0.711],
  meter: [0.319, 0.327, 0.371, 0.369],
  ups: [0.42, 0.346, 0.164, 0.479],
  switch: [0.197, 0.358, 0.609, 0.296],
  socket: [0.286, 0.298, 0.448, 0.462],
  motor: [0.344, 0.262, 0.364, 0.417],
  sensor: [0.348, 0.402, 0.652, 0.241],
  stack: [0.379, 0.227, 0.242, 0.616],
  hmi: [0.214, 0.22, 0.616, 0.601],
  button: [0.147, 0.363, 0.71, 0.295],
};

// 横向压窄但保持高度不变（UPS 塔式机宽度收窄）
const SQUEEZE: Partial<Record<Kind, number>> = { ups: 0.85 };

// 实物照片渲染：按产品实际范围裁切，等比缩放居中填充；超宽层自动重复拼接
function PhotoShape({ part, src }: { part: Part; src: string }) {
  const { x, y, w, h, kind } = part;
  const imgRatio = KIND_RATIO[kind] ?? w / h;
  const [bx, by, bw, bh] = CROP[kind] ?? [0, 0, 1, 1];
  const cw = bw * imgRatio;
  const prodRatio = cw / bh;
  const n = w / h >= 2.2 ? Math.max(1, Math.round(w / (h * prodRatio))) : 1;
  const sw = w / n;
  const sq = SQUEEZE[kind] ?? 1;
  const s = sq !== 1 ? h / bh : Math.min(sw / cw, h / bh);
  const sx = s * sq;
  const iw = imgRatio * sx;
  const ih = s;
  const ix = sw / 2 - (bx * imgRatio + cw / 2) * sx;
  const iy = h / 2 - (by + bh / 2) * s;
  return (
    <g filter="url(#dshadow)">
      <defs>
        {Array.from({ length: n }).map((_, i) => (
          <clipPath key={i} id={`clip-${part.key}-${i}`}>
            <rect x={0} y={0} width={sw} height={h} rx={1.6} />
          </clipPath>
        ))}
      </defs>
      {Array.from({ length: n }).map((_, i) => (
        <g key={i} transform={`translate(${x + i * sw} ${y})`}>
          <image
            href={src}
            x={ix}
            y={iy}
            width={iw}
            height={ih}
            preserveAspectRatio="none"
            clipPath={`url(#clip-${part.key}-${i})`}
          />
        </g>
      ))}
    </g>
  );
}

function PartShape({ part, accent }: { part: Part; accent: string }) {
  const { x, y, w, h, kind } = part;
  const img = PART_IMAGE[kind];
  if (img) return <PhotoShape part={part} src={`/images/components/${img}.webp`} />;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const body = {
    fill: "url(#plastic)",
    stroke: "#8a97a6",
    strokeWidth: 0.6,
    rx: 1.6,
  };

  switch (kind) {
    case "fan": {
      const r = Math.min(w, h) / 2 - 4.5;
      return (
        <g filter="url(#dshadow)">
          <rect x={x} y={y} width={w} height={h} rx={3} fill="url(#frame)" stroke="#374151" strokeWidth={0.7} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={h - 2.4} rx={2.4} fill="url(#darkcase)" />
          <rect x={x + 1.4} y={y + 1.4} width={w - 2.8} height={1.1} rx={0.55} fill="#e2e8f0" opacity={0.28} />
          <circle cx={cx} cy={cy} r={r + 2.6} fill="#0b1220" opacity={0.5} />
          <circle cx={cx} cy={cy} r={r + 1.8} fill="#111827" stroke="#64748b" strokeWidth={0.5} />
          {Array.from({ length: 7 }).map((_, i) => {
            const a0 = (i * Math.PI * 2) / 7;
            const a1 = a0 + 0.78;
            const mr = r * 0.82;
            return (
              <path
                key={i}
                d={`M${cx} ${cy} Q ${cx + mr * Math.cos(a0 + 0.3)} ${cy + mr * Math.sin(a0 + 0.3)} ${
                  cx + r * Math.cos(a1)
                } ${cy + r * Math.sin(a1)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} Z`}
                fill="#94a3b8"
                opacity={0.72}
                stroke="#e2e8f0"
                strokeWidth={0.3}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ffffff" strokeWidth={0.35} opacity={0.22} />
          <circle cx={cx} cy={cy} r={r * 0.66} fill="none" stroke="#ffffff" strokeWidth={0.3} opacity={0.16} />
          <circle cx={cx} cy={cy} r={3.1} fill="url(#screw)" stroke="#334155" strokeWidth={0.4} />
          <circle cx={cx - 0.8} cy={cy - 0.8} r={0.9} fill="#f8fafc" opacity={0.7} />
          <Screw cx={x + 3.4} cy={y + 3.4} r={1} />
          <Screw cx={x + w - 3.4} cy={y + 3.4} r={1} />
          <Screw cx={x + 3.4} cy={y + h - 3.4} r={1} />
          <Screw cx={x + w - 3.4} cy={y + h - 3.4} r={1} />
        </g>
      );
    }
    case "stat": {
      const dialX = x + w * 0.66;
      const dialY = cy;
      const dialR = Math.min(w, h) * 0.27;
      return (
        <g filter="url(#dshadow)">
          {/* 温控器：浅灰面板 + 旋钮刻度 */}
          <rect x={x} y={y} width={w} height={h} rx={2} fill="url(#dface)" stroke="#94a3b8" strokeWidth={0.6} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={1} rx={0.5} fill="#ffffff" opacity={0.85} />
          {Array.from({ length: 9 }).map((_, i) => {
            const a = Math.PI * 0.75 + (i * Math.PI * 1.5) / 8;
            return (
              <line
                key={i}
                x1={dialX + Math.cos(a) * (dialR + 1.2)}
                y1={dialY + Math.sin(a) * (dialR + 1.2)}
                x2={dialX + Math.cos(a) * (dialR + 2.6)}
                y2={dialY + Math.sin(a) * (dialR + 2.6)}
                stroke="#64748b"
                strokeWidth={0.45}
              />
            );
          })}
          <circle cx={dialX} cy={dialY} r={dialR} fill="#eef2f6" stroke="#94a3b8" strokeWidth={0.5} />
          <circle cx={dialX} cy={dialY} r={dialR * 0.72} fill="url(#caseLight)" stroke="#aab4c0" strokeWidth={0.35} />
          <line
            x1={dialX}
            y1={dialY}
            x2={dialX + Math.cos(Math.PI * 1.15) * dialR * 0.62}
            y2={dialY + Math.sin(Math.PI * 1.15) * dialR * 0.62}
            stroke={accent}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
          <text x={x + 4.4} y={y + 10.4} fontSize={3.2} fontFamily="monospace" fill="#475569">
            TEMP
          </text>
          <text x={x + 4.4} y={y + 15} fontSize={2.4} fontFamily="monospace" fill="#64748b">
            5–30℃
          </text>
          <Led cx={x + 6} cy={y + h - 6} r={1.1} />
          <text x={x + 10} y={y + h - 4.6} fontSize={2.2} fontFamily="monospace" fill="#475569">
            HEAT
          </text>
        </g>
      );
    }
    case "breaker": {
      const poles = Math.max(2, Math.min(8, Math.round(w / 28)));
      const step = (w - 4) / poles;
      return (
        <g filter="url(#dshadow)">
          {/* 施耐德 iC60 微断：白色/浅灰壳体 */}
          <rect x={x} y={y} width={w} height={h} rx={1.4} fill="url(#dface)" stroke="#8a97a6" strokeWidth={0.6} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={1} fill="#ffffff" opacity={0.9} />
          {Array.from({ length: poles }).map((_, i) => {
            const bx = x + 2 + i * step;
            const bw = step - 1.2;
            return (
              <g key={i}>
                <rect x={bx} y={y + 1.6} width={bw} height={h - 3.2} rx={0.8} fill="#f1f4f8" stroke="#aab4c0" strokeWidth={0.3} />
                {/* 上下接线端子 */}
                <rect x={bx + 1.2} y={y + 2} width={bw - 2.4} height={3.2} rx={0.3} fill="#5b6472" />
                <rect x={bx + 1.2} y={y + h - 5.2} width={bw - 2.4} height={3.2} rx={0.3} fill="#5b6472" />
                {/* 手柄滑槽 + 黑色手柄 */}
                <rect x={bx + bw / 2 - 3.4} y={y + 6.4} width={6.8} height={h - 16} rx={0.6} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={0.25} />
                <rect x={bx + bw / 2 - 2.6} y={y + 7.2} width={5.2} height={8.2} rx={0.8} fill="#171c23" />
                <rect x={bx + bw / 2 - 1.4} y={y + 8.2} width={2.8} height={2.2} rx={0.4} fill="#4b5563" />
                {/* 绿色/红色分合指示窗 */}
                <rect x={bx + bw - 4.6} y={y + 7} width={3} height={2.2} rx={0.3} fill="#22c55e" />
                <rect x={bx + bw - 4.6} y={y + 9.6} width={3} height={2.2} rx={0.3} fill="#ef4444" />
                {i === 0 && (
                  <text x={bx + 2} y={y + h - 7} fontSize={2.2} fontFamily="monospace" fill="#475569">
                    iC60N
                  </text>
                )}
              </g>
            );
          })}
        </g>
      );
    }
    case "mccb": {
      const poleW = (w - 10) / 3;
      return (
        <g filter="url(#dshadow)">
          {/* 施耐德 NSX 塑壳断路器：浅灰壳体 */}
          <rect x={x} y={y} width={w} height={h} rx={2} fill="url(#dbody)" stroke="#7d8894" strokeWidth={0.7} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={h - 2.4} rx={1.2} fill="url(#dface)" stroke="#b6c2cf" strokeWidth={0.35} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={1} fill="#ffffff" opacity={0.9} />
          {/* 顶部三极端子 */}
          {[0, 1, 2].map((i) => {
            const tx = x + 4 + i * poleW;
            return (
              <g key={`t${i}`}>
                <rect x={tx + 0.8} y={y + 2.4} width={poleW - 1.6} height={4.6} rx={0.4} fill="#4a5260" stroke="#2b323b" strokeWidth={0.25} />
                <circle cx={tx + poleW / 2} cy={y + 4.7} r={1.4} fill="#5b6472" stroke="#232a33" strokeWidth={0.2} />
                <line x1={tx + poleW / 2 - 0.7} y1={y + 4.7} x2={tx + poleW / 2 + 0.7} y2={y + 4.7} stroke="#e2e8f0" strokeWidth={0.3} />
              </g>
            );
          })}
          {/* 分极线 */}
          <line x1={x + 4 + poleW} y1={y + 9} x2={x + 4 + poleW} y2={y + h - 9} stroke="#94a3b8" strokeWidth={0.4} />
          <line x1={x + 4 + poleW * 2} y1={y + 9} x2={x + 4 + poleW * 2} y2={y + h - 9} stroke="#94a3b8" strokeWidth={0.4} />
          {/* 扳动手柄 */}
          <rect x={cx - 6.5} y={y + 10} width={13} height={Math.max(18, h * 0.46)} rx={1} fill="#cbd5e1" stroke="#8a97a6" strokeWidth={0.35} />
          <rect x={cx - 4.8} y={y + 11.4} width={9.6} height={Math.max(14, h * 0.42)} rx={1} fill="#171c23" stroke="#0b1220" strokeWidth={0.3} />
          <rect x={cx - 3.4} y={y + 13.4} width={6.8} height={2.6} rx={0.6} fill="#4b5563" />
          {/* 铭牌与分合位置 */}
          <rect x={cx - 9} y={y + h - 20} width={18} height={6} rx={0.4} fill="#111827" opacity={0.9} />
          <text x={cx} y={y + h - 15.6} textAnchor="middle" fontSize={2.4} fontFamily="monospace" fill="#e2e8f0">
            NSX
          </text>
          <text x={x + 3.2} y={y + 13.6} fontSize={2.2} fontFamily="monospace" fill="#475569">
            ON
          </text>
          {/* 品牌条 */}
          <rect x={x + 4} y={y + h - 11} width={w * 0.3} height={2.6} rx={0.4} fill="#3dcd58" />
          <text x={x + w - 3.4} y={y + h - 9.4} textAnchor="end" fontSize={2.2} fontFamily="monospace" fill="#475569">
            3P 100A
          </text>
          {/* 底部三极端子 */}
          {[0, 1, 2].map((i) => {
            const tx = x + 4 + i * poleW;
            return (
              <g key={`b${i}`}>
                <rect x={tx + 0.8} y={y + h - 7} width={poleW - 1.6} height={4.6} rx={0.4} fill="#4a5260" stroke="#2b323b" strokeWidth={0.25} />
                <circle cx={tx + poleW / 2} cy={y + h - 4.7} r={1.4} fill="#5b6472" stroke="#232a33" strokeWidth={0.2} />
              </g>
            );
          })}
        </g>
      );
    }
    case "contactor": {
      const termW = (w - 12) / 3;
      return (
        <g filter="url(#dshadow)">
          {/* 施耐德 LC1 接触器：浅灰热塑壳体 */}
          <rect x={x} y={y} width={w} height={h} rx={1.8} fill="url(#dface)" stroke="#7d8894" strokeWidth={0.7} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={h - 2.4} rx={1} fill="#eef2f6" stroke="#c3ccd6" strokeWidth={0.3} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={1} fill="#ffffff" opacity={0.9} />
          {/* 上下各三组端子螺钉 */}
          {[0, 1, 2].map((i) => {
            const tx = x + 6 + i * termW;
            const tcx = tx + (termW - 3) / 2;
            return (
              <g key={i}>
                <rect x={tx} y={y + 2.2} width={termW - 3} height={9.6} rx={0.6} fill="#d8dee6" stroke="#a3aeb9" strokeWidth={0.3} />
                <circle cx={tcx} cy={y + 7} r={2} fill="#5b6472" stroke="#232a33" strokeWidth={0.25} />
                <line x1={tcx - 1} y1={y + 7} x2={tcx + 1} y2={y + 7} stroke="#e2e8f0" strokeWidth={0.35} />
                <rect x={tx} y={y + h - 11.8} width={termW - 3} height={9.6} rx={0.6} fill="#d8dee6" stroke="#a3aeb9" strokeWidth={0.3} />
                <circle cx={tcx} cy={y + h - 7} r={2} fill="#5b6472" stroke="#232a33" strokeWidth={0.25} />
                <line x1={tcx - 1} y1={y + h - 7} x2={tcx + 1} y2={y + h - 7} stroke="#e2e8f0" strokeWidth={0.35} />
              </g>
            );
          })}
          {/* 中间磁系统腔 + 绿色品牌条 */}
          <rect x={x + 4} y={y + h * 0.34} width={w - 8} height={h * 0.3} rx={1.2} fill="url(#darkcase)" stroke="#1f2937" strokeWidth={0.35} />
          <rect x={x + 4} y={y + h * 0.34} width={5} height={h * 0.3} rx={0.8} fill="#3dcd58" />
          <text x={x + 12} y={y + h * 0.52} fontSize={3.2} fontFamily="monospace" fill="#e2e8f0" fontWeight={700}>
            LC1
          </text>
          <text x={x + w - 5.4} y={y + h * 0.52} textAnchor="end" fontSize={2.2} fontFamily="monospace" fill="#cbd5e1">
            AC-3
          </text>
          <Led cx={x + w - 7} cy={y + h * 0.6} r={1.1} />
        </g>
      );
    }
    case "relay":
      return (
        <g filter="url(#dshadow)">
          <rect x={x} y={y} width={w} height={h} rx={1.3} fill="url(#bluecase)" stroke="#60a5fa" strokeWidth={0.6} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={0.9} fill="#dbeafe" opacity={0.55} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={1} rx={0.5} fill="#ffffff" opacity={0.8} />
          <rect x={x + 3} y={y + 3} width={w * 0.54} height={h - 8} rx={0.5} fill="url(#pcb)" stroke="#14532d" strokeWidth={0.3} />
          <rect x={x + 6} y={cy - 4.6} width={w * 0.19} height={9.2} rx={0.7} fill="#fbbf24" stroke="#b45309" strokeWidth={0.35} />
          <rect x={x + 6} y={cy - 4.6} width={w * 0.19} height={1.4} rx={0.4} fill="#fde68a" />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={x + 5 + i * 6} cy={y + h - 3.4} r={0.8} fill="#bfdbfe" />
          ))}
          <Led cx={x + w - 8} cy={y + 6.4} r={1.1} />
          <text x={x + w - 8} y={y + h - 5} textAnchor="end" fontSize={3} fontFamily="monospace" fill="#475569">
            24V
          </text>
          <rect x={x + w - 5} y={y + h * 0.42} width={2.6} height={h * 0.36} fill="#94a3b8" />
          <Screw cx={x + 2.2} cy={y + 2.2} r={0.8} />
          <Screw cx={x + 2.2} cy={y + h - 2.2} r={0.8} />
        </g>
      );
    case "rack": {
      const connW = Math.min(30, w * 0.17);
      const cpuX = x + connW + 6;
      const cpuW = x + w - 3 - cpuX;
      const termH = 6.4;
      const termY = y + h - termH - 2.4;
      const termN = Math.max(4, Math.floor(cpuW / 9));
      const ledX = cpuX + 2.4;
      const ledY = y + 6;
      return (
        <g filter="url(#dshadow)">
          {/* SIMATIC S7-1200 浅灰塑料壳体 */}
          <rect x={x} y={y} width={w} height={h} rx={1.8} fill="url(#dface)" stroke="#7d8894" strokeWidth={0.7} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={1} rx={0.5} fill="#ffffff" opacity={0.85} />
          <rect x={x + w - 2.8} y={y + 1.4} width={1.4} height={h - 2.8} fill="#0f172a" opacity={0.07} />
          {/* 左侧可插拔前连接器：深灰窄条 + 接线孔 + 螺钉 */}
          <rect x={x + 2.2} y={y + 2.2} width={connW} height={h - 4.4} rx={0.7} fill="url(#anthracite)" stroke="#111827" strokeWidth={0.35} />
          <rect x={x + 2.2} y={y + 2.2} width={connW} height={0.9} fill="#9ca3af" opacity={0.4} />
          {Array.from({ length: Math.max(2, Math.floor((h - 9) / 5.2)) }).map((_, i) => {
            const hy = y + 6.6 + i * 5.2;
            const hx = x + 2.2 + connW * 0.32;
            return (
              <g key={i}>
                <circle cx={hx} cy={hy} r={1.2} fill="#5b6472" stroke="#2b323b" strokeWidth={0.2} />
                <line x1={hx - 0.6} y1={hy} x2={hx + 0.6} y2={hy} stroke="#cbd5e1" strokeWidth={0.3} />
                <rect
                  x={x + 2.2 + connW * 0.58}
                  y={hy - 1.1}
                  width={connW * 0.3}
                  height={2.2}
                  rx={0.25}
                  fill="#0b1220"
                  stroke="#4b5563"
                  strokeWidth={0.15}
                />
              </g>
            );
          })}
          {/* 顶部状态 LED 排：RUN / ERROR / MAINT */}
          {[
            { label: "RUN", color: "#22c55e" },
            { label: "ERR", color: "#ef4444" },
            { label: "MAINT", color: "#f59e0b" },
          ].map((item, i) => (
            <g key={item.label}>
              <Led cx={ledX + i * 21} cy={ledY} r={0.95} color={item.color} />
              <text x={ledX + i * 21} y={ledY + 4.2} textAnchor="middle" fontSize={2.2} fontFamily="monospace" fill="#475569">
                {item.label}
              </text>
            </g>
          ))}
          {/* 右侧以太网口：深色方口 + 双 LED */}
          <rect x={x + w - 16.5} y={y + 3.2} width={12.6} height={9.6} rx={0.6} fill="#111827" stroke="#4b5563" strokeWidth={0.35} />
          <rect x={x + w - 15.4} y={y + 4.3} width={10.4} height={5.2} rx={0.3} fill="#020617" stroke="#6b7280" strokeWidth={0.25} />
          <rect x={x + w - 14.2} y={y + 10} width={3.6} height={1.6} rx={0.2} fill="#6b7280" />
          <Led cx={x + w - 15} cy={y + 11.6} r={0.65} color="#22c55e" />
          <Led cx={x + w - 12.6} cy={y + 11.6} r={0.65} color="#f59e0b" />
          {/* 面板丝印 */}
          <text x={cpuX} y={y + 13.8} fontSize={3.2} fontFamily="monospace" fill="#475569" fontWeight={700}>
            SIMATIC S7-1200
          </text>
          <text x={cpuX} y={y + 18.2} fontSize={2.6} fontFamily="monospace" fill="#475569">
            CPU 1214C
          </text>
          {/* 底部 I/O 接线端子 */}
          <rect x={cpuX - 1.4} y={termY} width={cpuW + 1.4} height={termH} rx={0.6} fill="#4a5260" stroke="#2b323b" strokeWidth={0.3} />
          {Array.from({ length: termN }).map((_, i) => {
            const hx = cpuX - 0.4 + (i + 0.5) * ((cpuW + 0.8) / termN);
            return (
              <g key={i}>
                <circle cx={hx} cy={termY + termH / 2} r={1.45} fill="#5b6472" stroke="#232a33" strokeWidth={0.2} />
                <line x1={hx - 0.75} y1={termY + termH / 2} x2={hx + 0.75} y2={termY + termH / 2} stroke="#cbd5e1" strokeWidth={0.3} />
              </g>
            );
          })}
        </g>
      );
    }
    case "module": {
      const mN = Math.max(3, Math.floor((w - 6) / 14));
      return (
        <g filter="url(#dshadow)">
          {/* ET200 分布式 I/O：窄条浅灰模块 */}
          <rect x={x} y={y} width={w} height={h} rx={1.2} fill="url(#dface)" stroke="#8a97a6" strokeWidth={0.6} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={0.9} fill="#ffffff" opacity={0.85} />
          {/* 顶部接线端子 */}
          <rect x={x + 1.6} y={y + 1.4} width={w - 3.2} height={4.4} rx={0.4} fill="#4a5260" stroke="#2b323b" strokeWidth={0.25} />
          {Array.from({ length: mN }).map((_, i) => {
            const hx = x + 1.6 + (i + 0.5) * ((w - 3.2) / mN);
            return (
              <g key={i}>
                <circle cx={hx} cy={y + 3.6} r={1.15} fill="#5b6472" stroke="#20262e" strokeWidth={0.2} />
                <line x1={hx - 0.55} y1={y + 3.6} x2={hx + 0.55} y2={y + 3.6} stroke="#cbd5e1" strokeWidth={0.28} />
              </g>
            );
          })}
          {/* 底部接线端子 */}
          <rect x={x + 1.6} y={y + h - 5.8} width={w - 3.2} height={4.4} rx={0.4} fill="#4a5260" stroke="#2b323b" strokeWidth={0.25} />
          {Array.from({ length: mN }).map((_, i) => {
            const hx = x + 1.6 + (i + 0.5) * ((w - 3.2) / mN);
            return <circle key={i} cx={hx} cy={y + h - 3.6} r={1.05} fill="#5b6472" stroke="#20262e" strokeWidth={0.2} />;
          })}
          {/* 状态 LED + 模块标识 */}
          {["#22c55e", "#22c55e", "#f59e0b"].map((color, i) => (
            <Led key={i} cx={x + 4.4} cy={y + 8.4 + i * 3.6} r={0.8} color={color} />
          ))}
          <rect x={x + 8} y={y + 6.6} width={w - 13} height={h - 13.2} rx={0.4} fill="#f8fafc" stroke="#b6c2cf" strokeWidth={0.25} />
          <text x={x + 9.4} y={y + 11} fontSize={2.4} fontFamily="monospace" fill="#475569">
            ET200SP
          </text>
          <text x={x + 9.4} y={y + 14.2} fontSize={2.2} fontFamily="monospace" fill="#64748b">
            DI 16×24V
          </text>
          {/* 右侧散热缝 */}
          {Array.from({ length: 3 }).map((_, i) => (
            <rect key={i} x={x + w - 4.2} y={y + 8 + i * 4} width={1.8} height={2.4} rx={0.3} fill="#94a3b8" opacity={0.6} />
          ))}
        </g>
      );
    }
    case "power": {
      const ventN = Math.max(6, Math.floor((w - 15) / 3.6));
      const plateY = y + h * 0.24;
      const plateH = h * 0.33;
      const termY = y + h - 10.4;
      return (
        <g filter="url(#dshadow)">
          {/* 明纬 LRS 系列：银色铝壳 + 侧面散热栅格 */}
          <rect x={x} y={y} width={w} height={h} rx={1.6} fill="url(#metal)" stroke="#8b98a5" strokeWidth={0.6} />
          <rect x={x + 1.1} y={y + 1.1} width={w - 2.2} height={h - 2.2} rx={0.9} fill="url(#dbody)" stroke="#b9c4cf" strokeWidth={0.3} />
          <rect x={x + 1.1} y={y + 1.1} width={w - 2.2} height={0.9} fill="#ffffff" opacity={0.9} />
          {Array.from({ length: ventN }).map((_, i) => (
            <line
              key={i}
              x1={x + 10 + i * ((w - 15) / Math.max(1, ventN - 1))}
              y1={y + 3.2}
              x2={x + 10 + i * ((w - 15) / Math.max(1, ventN - 1))}
              y2={y + 11.4}
              stroke="#7c8794"
              strokeWidth={0.85}
              opacity={0.62}
            />
          ))}
          {/* 白色铭牌 */}
          <rect x={x + 3.4} y={plateY} width={w - 6.8} height={plateH} rx={0.4} fill="#ffffff" stroke="#c3ccd6" strokeWidth={0.25} />
          <text x={x + 5} y={plateY + plateH * 0.28} fontSize={2.5} fontFamily="monospace" fill="#475569">
            MEAN WELL
          </text>
          <text x={x + 5} y={plateY + plateH * 0.62} fontSize={3.2} fontFamily="monospace" fill="#0f172a" fontWeight={700}>
            LRS-350
          </text>
          <text x={x + 5} y={plateY + plateH * 0.9} fontSize={2.2} fontFamily="monospace" fill="#64748b">
            24V 14.6A
          </text>
          {/* DC OK 指示灯 */}
          <Led cx={x + 5.4} cy={y + 6.2} r={1.05} />
          {/* 输出电压调节电位器 */}
          <circle cx={x + w - 6.4} cy={termY - 5.6} r={2.4} fill="#cbd5e1" stroke="#64748b" strokeWidth={0.35} />
          <line x1={x + w - 6.4} y1={termY - 5.6} x2={x + w - 5.2} y2={termY - 7} stroke="#334155" strokeWidth={0.45} />
          {/* 底部绿色接线端子 */}
          <rect x={x + 2.6} y={termY} width={w - 5.2} height={7.4} rx={0.6} fill="#15803d" stroke="#14532d" strokeWidth={0.3} />
          {[0, 1, 2, 3, 4].map((i) => {
            const tx = x + 2.6 + (w - 5.2) * (0.14 + i * 0.18);
            return (
              <g key={i}>
                <circle cx={tx} cy={termY + 3.2} r={1.5} fill="#5b6472" stroke="#0b3d1f" strokeWidth={0.2} />
                <line x1={tx - 0.7} y1={termY + 3.2} x2={tx + 0.7} y2={termY + 3.2} stroke="#e2e8f0" strokeWidth={0.3} />
              </g>
            );
          })}
          {["L", "N", "PE", "-V", "+V"].map((t, i) => (
            <text
              key={t}
              x={x + 2.6 + (w - 5.2) * (0.14 + i * 0.18)}
              y={termY + 6.9}
              textAnchor="middle"
              fontSize={2.2}
              fontFamily="monospace"
              fill="#dcfce7"
            >
              {t}
            </text>
          ))}
        </g>
      );
    }
    case "terminal": {
      const n = Math.max(8, Math.floor(w / 12));
      const step = w / n;
      return (
        <g filter="url(#dshadow)">
          <rect x={x} y={y} width={w} height={h} rx={1} fill="url(#dbody)" stroke="#94a3b8" strokeWidth={0.5} />
          {Array.from({ length: n }).map((_, i) => {
            const bx = x + i * step;
            const tint = i % 4 === 0 ? "#e2e8f0" : "#f8fafc";
            return (
              <g key={i}>
                <rect x={bx + 0.3} y={y + 2} width={step - 0.9} height={h - 4} fill={tint} stroke="#b6c2cf" strokeWidth={0.25} />
                <rect x={bx + 0.3} y={y + 2} width={step - 0.9} height={0.8} fill="#ffffff" opacity={0.9} />
                <rect x={bx + step / 2 - 2.4} y={y + 3} width={4.8} height={2.4} rx={0.3} fill="#64748b" />
                <circle cx={bx + step / 2} cy={y + 7.6} r={1.7} fill="url(#screw)" stroke="#6b7280" strokeWidth={0.3} />
                <line
                  x1={bx + step / 2 - 1.1}
                  y1={y + 7.6}
                  x2={bx + step / 2 + 1.1}
                  y2={y + 7.6}
                  stroke="#4b5563"
                  strokeWidth={0.35}
                />
                <rect x={bx + step / 2 - 1.2} y={y + 11} width={2.4} height={h - 21} fill="#d1d5db" />
                <circle cx={bx + step / 2} cy={y + h - 6.6} r={1.6} fill="#9ca3af" stroke="#64748b" strokeWidth={0.25} />
                {i % 2 === 0 ? (
                  <g>
                    <rect
                      x={bx + 0.9}
                      y={y + 1}
                      width={step - 1.8}
                      height={2.1}
                      fill={
                        ["#2563eb", "#dc2626", "#f59e0b", "#16a34a", "#334155"][i % 5]
                      }
                      opacity={0.9}
                    />
                    <rect x={bx + 0.9} y={y + 1} width={step - 1.8} height={0.7} fill="#ffffff" opacity={0.35} />
                  </g>
                ) : null}
              </g>
            );
          })}
        </g>
      );
    }
    case "duct":
      return (
        <g filter="url(#dshadow)">
          {/* 灰色 PVC 梳齿线槽 */}
          <rect x={x} y={y} width={w} height={h} rx={0.8} fill="url(#dbody)" stroke="#9aa5b1" strokeWidth={0.5} />
          <rect x={x} y={y} width={w} height={1.2} fill="#ffffff" opacity={0.75} />
          <rect x={x} y={y + h - 1.2} width={w} height={1.2} fill="#64748b" opacity={0.35} />
          <rect x={x + 1.5} y={y + 3.4} width={w - 3} height={Math.max(2, h - 6.8)} fill="#7b8694" opacity={0.5} />
          {Array.from({ length: Math.max(2, Math.floor(w / 9)) }).map((_, i) => (
            <rect
              key={i}
              x={x + 3.6 + i * 9}
              y={y + 1.8}
              width={5}
              height={h - 3.6}
              rx={0.5}
              fill="url(#dface)"
              stroke="#aab4c0"
              strokeWidth={0.3}
            />
          ))}
        </g>
      );
    case "rail":
      return (
        <g filter="url(#dshadow)">
          {/* 镀锌钢 DIN 导轨 */}
          <rect x={x} y={y} width={w} height={h} rx={0.4} fill="url(#steel)" stroke="#6b7280" strokeWidth={0.45} />
          <rect x={x} y={y} width={w} height={1.1} fill="#eef2f6" opacity={0.8} />
          <rect x={x} y={y + h - 1} width={w} height={1} fill="#64748b" opacity={0.45} />
          {Array.from({ length: Math.max(2, Math.floor(w / 42)) }).map((_, i) => (
            <circle
              key={i}
              cx={x + 21 + i * 42}
              cy={cy}
              r={Math.max(1, Math.min(1.7, h / 2 - 1.2))}
              fill="#5b6472"
              stroke="#94a3b8"
              strokeWidth={0.25}
            />
          ))}
        </g>
      );
    case "lug":
      return (
        <g filter="url(#dshadow)">
          <rect x={x} y={y + 2} width={w} height={h - 4} rx={1} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={0.4} />
          <rect x={x} y={y + 2} width={w} height={1} fill="#ffffff" opacity={0.9} />
          {Array.from({ length: Math.floor(w / 17) }).map((_, i) => (
            <g key={i}>
              <rect x={x + 5 + i * 17} y={cy - 6} width={12} height={12} rx={2} fill="url(#copper)" stroke="#8a4a12" strokeWidth={0.35} />
              <circle cx={x + 8.5 + i * 17} cy={cy} r={2.7} fill="none" stroke="#7c2d12" strokeWidth={1} />
              <circle cx={x + 8.5 + i * 17} cy={cy} r={1.3} fill="#f8fafc" opacity={0.35} />
              <rect x={x + 12.5 + i * 17} y={cy - 2.6} width={4.5} height={5.2} rx={0.8} fill="#b45309" />
              <rect x={x + 12.5 + i * 17} y={cy - 2.6} width={4.5} height={1} fill="#fbbf24" opacity={0.7} />
            </g>
          ))}
        </g>
      );
    case "drive": {
      const panelX = x + w * 0.1;
      const panelW = w * 0.8;
      const panelY = y + h * 0.15;
      const panelH = h * 0.42;
      const lcdY = panelY + 3;
      const lcdH = panelH * 0.38;
      const keyY = panelY + panelH * 0.7;
      const keySize = Math.min(6.6, panelW * 0.095);
      const crossX = panelX + panelW * 0.28;
      const ventTopH = h * 0.1;
      const ventBotY = y + h * 0.63;
      const ventBotH = h * 0.08;
      return (
        <g filter="url(#dshadow)">
          {/* ABB ACS580 浅灰白机身 */}
          <rect x={x} y={y} width={w} height={h} rx={2} fill="url(#dbody)" stroke="#8a97a6" strokeWidth={0.8} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={1} rx={0.5} fill="#ffffff" opacity={0.8} />
          {/* 顶部散热栅格 */}
          <rect x={x + 3.4} y={y + 3} width={w - 6.8} height={ventTopH} rx={0.6} fill="#c2ccd7" opacity={0.5} />
          {Array.from({ length: Math.max(6, Math.floor((w - 10) / 4.4)) }).map((_, i) => (
            <line
              key={i}
              x1={x + 5.6 + i * 4.4}
              y1={y + 4.2}
              x2={x + 5.6 + i * 4.4}
              y2={y + 3 + ventTopH - 0.6}
              stroke="#7c8794"
              strokeWidth={0.8}
              opacity={0.65}
            />
          ))}
          {/* 可拆卸深灰控制面板 */}
          <rect x={panelX} y={panelY} width={panelW} height={panelH} rx={1.4} fill="url(#anthracite)" stroke="#111827" strokeWidth={0.45} />
          <rect x={panelX} y={panelY} width={panelW} height={0.9} rx={0.45} fill="#9ca3af" opacity={0.35} />
          <rect x={panelX + 3} y={lcdY} width={panelW - 6} height={lcdH} rx={0.6} fill="#cfe8e3" stroke="#0b1220" strokeWidth={0.35} />
          <rect x={panelX + 3} y={lcdY} width={panelW - 6} height={lcdH * 0.45} rx={0.6} fill="#ffffff" opacity={0.35} />
          <text x={panelX + 5} y={lcdY + lcdH * 0.68} fontSize={Math.min(4, lcdH * 0.6)} fontFamily="monospace" fill="#0f172a">
            50.0
          </text>
          <text x={panelX + panelW - 5} y={lcdY + lcdH * 0.68} textAnchor="end" fontSize={2.2} fontFamily="monospace" fill="#0f172a">
            Hz
          </text>
          {/* 上下左右方向键 */}
          {[0, 1, 2, 3].map((i) => {
            const kx = crossX + (i === 1 ? -(keySize + 1.2) : i === 2 ? keySize + 1.2 : 0) - keySize / 2;
            const ky = keyY + (i === 0 ? -(keySize * 0.84) : i === 3 ? keySize * 0.84 : 0) - keySize * 0.36;
            const kcx = kx + keySize / 2;
            const kcy = ky + keySize * 0.36;
            const rot = i === 1 ? -90 : i === 2 ? 90 : i === 3 ? 180 : 0;
            return (
              <g key={i}>
                <rect x={kx} y={ky} width={keySize} height={keySize * 0.72} rx={0.8} fill="#4b5563" stroke="#1f2937" strokeWidth={0.25} />
                <g transform={`rotate(${rot} ${kcx} ${kcy})`}>
                  <path d={`M${kcx - 1.9} ${kcy + 1.3} l1.9 -2.6 l1.9 2.6 z`} fill="#cbd5e1" />
                </g>
              </g>
            );
          })}
          {/* 两个软键 */}
          {[0, 1].map((i) => (
            <rect
              key={i}
              x={panelX + panelW * 0.56 + i * (panelW * 0.2 + 1.4)}
              y={keyY - 0.6}
              width={panelW * 0.2}
              height={keySize * 0.72 + 1.2}
              rx={0.8}
              fill="#4b5563"
              stroke="#1f2937"
              strokeWidth={0.25}
            />
          ))}
          {/* 底部散热栅格 */}
          <rect x={x + 3.4} y={ventBotY} width={w - 6.8} height={ventBotH} rx={0.6} fill="#c2ccd7" opacity={0.45} />
          {Array.from({ length: Math.max(6, Math.floor((w - 10) / 4.4)) }).map((_, i) => (
            <line
              key={i}
              x1={x + 5.6 + i * 4.4}
              y1={ventBotY + 0.8}
              x2={x + 5.6 + i * 4.4}
              y2={ventBotY + ventBotH - 0.6}
              stroke="#7c8794"
              strokeWidth={0.8}
              opacity={0.55}
            />
          ))}
          {/* 机身丝印 */}
          <text
            x={x + w - 4.4}
            y={y + h * 0.81}
            textAnchor="end"
            fontSize={4.4}
            fontFamily="monospace"
            fill="#475569"
            fontWeight={700}
          >
            ABB
          </text>
          <text x={x + w - 4.4} y={y + h * 0.88} textAnchor="end" fontSize={2.6} fontFamily="monospace" fill="#475569">
            ACS580
          </text>
          {/* 底部接线端子 */}
          <rect x={x + 4} y={y + h - 6} width={w - 8} height={4.2} rx={0.5} fill="#4a5260" stroke="#2b323b" strokeWidth={0.3} />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={x + w * (0.3 + i * 0.2)} cy={y + h - 3.9} r={1.3} fill="#5b6472" stroke="#232a33" strokeWidth={0.2} />
          ))}
        </g>
      );
    }
    case "servo": {
      const silverY = y + 3;
      const silverH = h * 0.4;
      const dispX = x + 4;
      const dispY = silverY + 5;
      const dispW = w - 16;
      const dispH = Math.min(12, silverH * 0.34);
      const segT = Math.max(1, dispH * 0.14);
      const dgW = dispW * 0.34;
      const dgH = dispH * 0.6;
      const dgX = dispX + dispW - dgW - 2.6;
      const dgY = dispY + (dispH - dgH) / 2;
      const segments = [
        `M${dgX + segT} ${dgY} H${dgX + dgW - segT}`,
        `M${dgX + dgW} ${dgY + segT} V${dgY + dgH / 2 - segT}`,
        `M${dgX + dgW} ${dgY + dgH / 2 + segT} V${dgY + dgH - segT}`,
        `M${dgX + segT} ${dgY + dgH} H${dgX + dgW - segT}`,
        `M${dgX} ${dgY + dgH / 2 + segT} V${dgY + dgH - segT}`,
        `M${dgX} ${dgY + segT} V${dgY + dgH / 2 - segT}`,
      ];
      const cnY = y + h - 17;
      const cnW = (w - 14) / 2;
      return (
        <g filter="url(#dshadow)">
          {/* 三菱 MELSERVO MR-J4：深灰黑机身 */}
          <rect x={x} y={y} width={w} height={h} rx={1.8} fill="url(#anthracite)" stroke="#0b1220" strokeWidth={0.8} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={0.9} fill="#9ca3af" opacity={0.3} />
          {/* 前面板上半部银色拉丝金属区 */}
          <rect x={x + 2.2} y={silverY} width={w - 4.4} height={silverH} rx={0.8} fill="url(#metal)" stroke="#94a3b8" strokeWidth={0.35} />
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={i}
              x1={x + 3.2}
              y1={silverY + 2 + i * ((silverH - 4) / 5)}
              x2={x + w - 3.2}
              y2={silverY + 2 + i * ((silverH - 4) / 5)}
              stroke="#ffffff"
              strokeWidth={0.3}
              opacity={0.4}
            />
          ))}
          {/* 两位七段数码管（显示 0） */}
          <rect x={dispX} y={dispY} width={dispW} height={dispH} rx={0.5} fill="#05080c" stroke="#374151" strokeWidth={0.25} />
          {segments.map((d, i) => (
            <path key={`d${i}`} d={d} stroke="#ff3b30" strokeWidth={segT} strokeLinecap="round" fill="none" />
          ))}
          <g opacity={0.22} transform={`translate(${-(dgW + 1.6)} 0)`}>
            {segments.map((d, i) => (
              <path key={`l${i}`} d={d} stroke="#ff3b30" strokeWidth={segT} strokeLinecap="round" fill="none" />
            ))}
          </g>
          {/* 右侧状态 LED 列 */}
          <Led cx={x + w - 5.4} cy={dispY + 1.8} r={0.95} color="#22c55e" />
          <Led cx={x + w - 5.4} cy={dispY + 6.4} r={0.95} color="#ef4444" />
          <Led cx={x + w - 5.4} cy={dispY + 11} r={0.95} color="#f59e0b" />
          {/* 型号丝印 */}
          <text x={x + w / 2} y={silverY + silverH + 8.4} textAnchor="middle" fontSize={2.6} fontFamily="monospace" fill="#cbd5e1">
            MELSERVO-J4
          </text>
          <text x={x + w / 2} y={silverY + silverH + 12.8} textAnchor="middle" fontSize={2.3} fontFamily="monospace" fill="#94a3b8">
            MR-J4-40A
          </text>
          {/* 中部散热缝 */}
          {Array.from({ length: 4 }).map((_, i) => (
            <rect key={i} x={x + 5} y={y + h * 0.58 + i * 3.4} width={w - 10} height={1.4} rx={0.7} fill="#0b1220" opacity={0.55} />
          ))}
          {/* 底部 CN 连接器 */}
          {[0, 1].map((i) => {
            const cxx = x + 4 + i * (cnW + 6);
            return (
              <g key={i}>
                <rect x={cxx} y={cnY} width={cnW} height={9} rx={0.6} fill="#111827" stroke="#4b5563" strokeWidth={0.3} />
                <rect x={cxx + 1.2} y={cnY + 1.2} width={cnW - 2.4} height={4.2} rx={0.3} fill="#020617" />
                <rect x={cxx + cnW * 0.34} y={cnY + 7.4} width={cnW * 0.32} height={1.4} fill="#9ca3af" />
                <text x={cxx + cnW / 2} y={cnY + 12.8} textAnchor="middle" fontSize={2.2} fontFamily="monospace" fill="#94a3b8">
                  {`CN${i + 1}`}
                </text>
              </g>
            );
          })}
        </g>
      );
    }
    case "transformer":
      return (
        <g filter="url(#dshadow)">
          {/* 环氧浇注干式变压器：深灰浇注体 */}
          <rect x={x} y={y} width={w} height={h} rx={1.4} fill="url(#anthracite)" stroke="#0b1220" strokeWidth={0.7} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={h - 2.4} rx={0.9} fill="#3a424d" opacity={0.55} />
          {/* 顶部端子排 */}
          <rect x={x + 5} y={y + 2} width={w - 10} height={8} rx={0.6} fill="#232a33" stroke="#0b1220" strokeWidth={0.3} />
          {[0.22, 0.5, 0.78].map((f, i) => (
            <g key={i}>
              <circle cx={x + w * f} cy={y + 6} r={1.7} fill="url(#screw)" stroke="#94a3b8" strokeWidth={0.25} />
              <circle cx={x + w * f} cy={y + 6} r={0.65} fill="#334155" />
            </g>
          ))}
          {/* 浇注体散热筋 */}
          {Array.from({ length: 5 }).map((_, i) => (
            <rect key={i} x={x + 6 + i * ((w - 12) / 4)} y={y + 12} width={2} height={h - 18} rx={0.6} fill="#0f172a" opacity={0.18} />
          ))}
          {/* 铭牌 */}
          <rect x={x + 8} y={y + h * 0.42} width={w - 16} height={h * 0.34} rx={0.5} fill="#e8eef4" stroke="#94a3b8" strokeWidth={0.3} />
          <text
            x={cx}
            y={y + h * 0.42 + h * 0.34 * 0.3}
            textAnchor="middle"
            fontSize={2.2}
            fontFamily="monospace"
            fill="#64748b"
          >
            DRY TYPE
          </text>
          <text
            x={cx}
            y={y + h * 0.42 + h * 0.34 * 0.62}
            textAnchor="middle"
            fontSize={3.2}
            fontFamily="monospace"
            fill="#1f2937"
          >
            400/230V
          </text>
          <text
            x={cx}
            y={y + h * 0.42 + h * 0.34 * 0.9}
            textAnchor="middle"
            fontSize={2.2}
            fontFamily="monospace"
            fill="#475569"
          >
            1.5kVA
          </text>
        </g>
      );
    case "filter":
      return (
        <g filter="url(#dshadow)">
          {/* EMI 滤波器：金属外壳 + 进出线端子 + 接地螺栓 */}
          <rect x={x} y={y} width={w} height={h} rx={1.6} fill="url(#steel)" stroke="#64748b" strokeWidth={0.7} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={h - 2.4} rx={0.9} fill="url(#metal)" stroke="#aab4c0" strokeWidth={0.3} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={0.9} fill="#ffffff" opacity={0.8} />
          {/* 顶部进线端子 */}
          <rect x={x + 6} y={y + 2.4} width={w - 12} height={5} rx={0.4} fill="#3a424d" stroke="#111827" strokeWidth={0.25} />
          {[0, 1, 2].map((i) => {
            const tx = x + w * (0.3 + i * 0.2);
            return (
              <g key={`in${i}`}>
                <circle cx={tx} cy={y + 4.9} r={1.5} fill="#5b6472" stroke="#111827" strokeWidth={0.2} />
                <line x1={tx - 0.7} y1={y + 4.9} x2={tx + 0.7} y2={y + 4.9} stroke="#e2e8f0" strokeWidth={0.3} />
              </g>
            );
          })}
          {/* 底部出线端子 */}
          <rect x={x + 6} y={y + h - 7.4} width={w - 12} height={5} rx={0.4} fill="#3a424d" stroke="#111827" strokeWidth={0.25} />
          {[0, 1, 2].map((i) => {
            const tx = x + w * (0.3 + i * 0.2);
            return (
              <g key={`out${i}`}>
                <circle cx={tx} cy={y + h - 4.9} r={1.5} fill="#5b6472" stroke="#111827" strokeWidth={0.2} />
                <line x1={tx - 0.7} y1={y + h - 4.9} x2={tx + 0.7} y2={y + h - 4.9} stroke="#e2e8f0" strokeWidth={0.3} />
              </g>
            );
          })}
          {/* 铭牌 */}
          <text x={cx} y={y + h * 0.52} textAnchor="middle" fontSize={2.6} fontFamily="monospace" fill="#475569">
            EMI FILTER
          </text>
          <text x={cx} y={y + h * 0.68} textAnchor="middle" fontSize={2.4} fontFamily="monospace" fill="#64748b">
            10A / 250V
          </text>
          {/* 接地螺栓 */}
          <circle cx={x + 8} cy={y + h / 2} r={2} fill="url(#screw)" stroke="#64748b" strokeWidth={0.3} />
          <circle cx={x + 8} cy={y + h / 2} r={0.8} fill="#334155" />
          <Screw cx={x + w - 4.4} cy={y + 6} r={0.9} />
          <Screw cx={x + w - 4.4} cy={y + h - 6} r={0.9} />
        </g>
      );
    case "meter":
      return (
        <g filter="url(#dshadow)">
          {/* 电力仪表：深色面板 + 红色 LED 数码显示 */}
          <rect x={x} y={y} width={w} height={h} rx={1.4} fill="url(#anthracite)" stroke="#0b1220" strokeWidth={0.7} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={h - 2.4} rx={0.9} fill="#141a22" stroke="#374151" strokeWidth={0.3} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={0.8} fill="#9ca3af" opacity={0.3} />
          <rect x={x + 3} y={y + 2.8} width={w - 6} height={13} rx={0.6} fill="#05080c" stroke="#334155" strokeWidth={0.3} />
          <text x={x + w - 4.8} y={y + 12} textAnchor="end" fontSize={4.4} fontFamily="monospace" fill="#ff3b30" fontWeight={700}>
            235.6
          </text>
          <text x={x + 4.6} y={y + 7.2} fontSize={2.2} fontFamily="monospace" fill="#cbd5e1">
            kWh
          </text>
          <text x={x + 4.6} y={y + 12} fontSize={2.2} fontFamily="monospace" fill="#94a3b8">
            AC
          </text>
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={x + 4 + i * 8.4}
              y={y + h - 8.6}
              width={5.6}
              height={3.6}
              rx={0.6}
              fill="#4b5563"
              stroke="#1f2937"
              strokeWidth={0.25}
            />
          ))}
          <Led cx={x + w - 6} cy={y + h - 6.8} r={1.1} />
        </g>
      );
    case "ups":
      return (
        <g filter="url(#dshadow)">
          {/* 机架式 UPS：深灰外壳 + 前面板 LCD + 状态灯 */}
          <rect x={x} y={y} width={w} height={h} rx={2} fill="url(#anthracite)" stroke="#0b1220" strokeWidth={0.8} />
          <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={1.2} fill="#2f3742" stroke="#111827" strokeWidth={0.35} />
          <rect x={x + 2} y={y + 2} width={w - 4} height={0.9} fill="#9ca3af" opacity={0.35} />
          <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={1} fill="#232a33" stroke="#0b1220" strokeWidth={0.35} />
          <rect x={x + 9} y={y + 8} width={70} height={29} rx={0.8} fill="url(#screen)" stroke="#0b1220" strokeWidth={0.35} />
          <rect x={x + 9} y={y + 8} width={70} height={12} rx={0.8} fill="url(#sheen)" opacity={0.45} />
          <text x={x + 13} y={y + 19} fontSize={4.4} fontFamily="monospace" fill="#7dd3fc">
            UPS
          </text>
          <text x={x + 13} y={y + 26} fontSize={2.6} fontFamily="monospace" fill="#cbd5e1">
            LOAD 32%
          </text>
          <rect x={x + 13} y={y + 29.4} width={56} height={2.6} rx={1.3} fill="#334155" />
          <rect x={x + 13} y={y + 29.4} width={18} height={2.6} rx={1.3} fill={accent} />
          {[
            { c: "#22c55e", l: "OK" },
            { c: "#f59e0b", l: "BAT" },
            { c: "#ef4444", l: "ALM" },
          ].map((s, i) => (
            <g key={s.l}>
              <Led cx={x + 90} cy={y + 14 + i * 10} r={1.15} color={s.c} />
              <text x={x + 94} y={y + 15.4 + i * 10} fontSize={2.2} fontFamily="monospace" fill="#cbd5e1">
                {s.l}
              </text>
            </g>
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <rect key={i} x={x + 118 + i * 9} y={y + 10} width={4.2} height={30} rx={2.1} fill="#161c24" />
          ))}
          <text x={x + 9} y={y + h - 6.4} fontSize={2.4} fontFamily="monospace" fill="#94a3b8">
            SMART-UPS 3000VA
          </text>
          <circle cx={x + 92} cy={y + h - 8.4} r={3.2} fill="#4b5563" stroke="#111827" strokeWidth={0.4} />
          <circle cx={x + 92} cy={y + h - 8.4} r={1.4} fill="#22c55e" />
        </g>
      );
    case "switch":
      return (
        <g filter="url(#dshadow)">
          {/* 工业交换机：黑色 1U 金属壳 */}
          <rect x={x} y={y} width={w} height={h} rx={1.6} fill="#0b1220" stroke="#020617" strokeWidth={0.7} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={h - 2.4} rx={1} fill="url(#anthracite)" stroke="#4b5563" strokeWidth={0.3} />
          <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={0.9} fill="#9ca3af" opacity={0.4} />
          {/* 一排 RJ45 端口 + 每口双色 LED + 金属屏蔽 */}
          {Array.from({ length: 8 }).map((_, i) => {
            const px = x + 8 + i * ((w - 16) / 8);
            return (
              <g key={i}>
                <rect x={px} y={y + 13.6} width={13} height={11} rx={0.5} fill="#0f172a" stroke="#94a3b8" strokeWidth={0.3} />
                <rect x={px + 1.8} y={y + 15.2} width={9.4} height={6.6} rx={0.3} fill="#020617" stroke="#4b5563" strokeWidth={0.25} />
                <rect x={px + 4.2} y={y + 15.2} width={4.6} height={2} rx={0.2} fill="#6b7280" />
                {[0, 1, 2, 3].map((k) => (
                  <line
                    key={k}
                    x1={px + 2.6}
                    y1={y + 18 + k * 0.9}
                    x2={px + 10.4}
                    y2={y + 18 + k * 0.9}
                    stroke="#fbbf24"
                    strokeWidth={0.3}
                    opacity={0.85}
                  />
                ))}
                <Led cx={px + 3.4} cy={y + 9.6} r={0.75} color="#22c55e" />
                <Led cx={px + 8.6} cy={y + 9.6} r={0.75} color="#f59e0b" />
                <Led cx={px + 6} cy={y + 28} r={0.75} color={i % 3 === 0 ? "#22c55e" : "#64748b"} />
              </g>
            );
          })}
          <text x={x + w - 6} y={y + h - 4.4} textAnchor="end" fontSize={2.6} fontFamily="monospace" fill="#cbd5e1">
            GbE · 1U
          </text>
          <Screw cx={x + 4} cy={y + 4} r={1} />
          <Screw cx={x + w - 4} cy={y + 4} r={1} />
          <Screw cx={x + 4} cy={y + h - 4} r={1} />
        </g>
      );
    case "socket":
      return (
        <g filter="url(#dshadow)">
          <rect x={x} y={y} width={w} height={h} rx={1.6} fill="url(#dface)" stroke="#94a3b8" strokeWidth={0.6} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={0.9} fill="#ffffff" opacity={0.9} />
          {[0, 1].map((i) => (
            <g key={i}>
              <circle cx={x + 26 + i * 34} cy={cy + 1} r={9} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={0.4} />
              <circle cx={x + 26 + i * 34} cy={cy + 1} r={8} fill="#eef2f7" stroke="#b6c2cf" strokeWidth={0.6} />
              <circle cx={x + 26 + i * 34} cy={cy + 1} r={8} fill="url(#sheen)" opacity={0.5} />
              <rect x={x + 22.6 + i * 34} y={cy - 1} width={2} height={4.6} rx={0.6} fill="#1f2937" />
              <rect x={x + 27.4 + i * 34} y={cy - 1} width={2} height={4.6} rx={0.6} fill="#1f2937" />
              <rect x={x + 24.8 + i * 34} y={cy - 5.4} width={2.4} height={2} rx={0.5} fill="#1f2937" />
              <path d={`M${x + 20 + i * 34} ${cy + 4} q 6 4 12 0`} fill="none" stroke="#94a3b8" strokeWidth={0.5} />
            </g>
          ))}
          <text x={x + w - 5} y={y + 8} textAnchor="end" fontSize={3.2} fontFamily="monospace" fill="#475569">
            230V~
          </text>
          <Screw cx={x + 5} cy={y + h - 5} r={1.1} />
          <Screw cx={x + w - 5} cy={y + h - 5} r={1.1} />
        </g>
      );
    case "motor":
      return (
        <g filter="url(#dshadow)">
          <rect x={cx - 16} y={y + 8} width={32} height={h - 14} rx={4} fill="url(#steel)" stroke="#475569" strokeWidth={0.9} />
          <rect x={cx - 14} y={y + 10} width={28} height={h - 18} rx={3} fill="#cbd5e1" opacity={0.35} />
          {Array.from({ length: 9 }).map((_, i) => (
            <line
              key={i}
              x1={cx - 15}
              y1={y + 12 + i * ((h - 22) / 8)}
              x2={cx + 15}
              y2={y + 12 + i * ((h - 22) / 8)}
              stroke="#94a3b8"
              strokeWidth={0.7}
              opacity={0.75}
            />
          ))}
          <rect x={cx - 9} y={y + 3} width={18} height={7} rx={1.2} fill="#374151" stroke="#1f2937" strokeWidth={0.4} />
          <rect x={cx - 7.5} y={y + 4.2} width={15} height={1.2} fill="#6b7280" opacity={0.7} />
          <circle cx={cx} cy={cy + 6} r={6.8} fill="url(#screw)" stroke="#475569" strokeWidth={0.7} />
          <circle cx={cx} cy={cy + 6} r={5.2} fill="#dbe3ea" stroke="#94a3b8" strokeWidth={0.4} />
          <text x={cx} y={cy + 8.6} textAnchor="middle" fontSize={4.4} fontFamily="monospace" fill="#475569">
            M
          </text>
          {[
            [-4.6, -4.6],
            [4.6, -4.6],
            [-4.6, 4.6],
            [4.6, 4.6],
          ].map(([dx, dy], i) => (
            <circle key={i} cx={cx + dx} cy={cy + 6 + dy} r={0.8} fill="#94a3b8" stroke="#64748b" strokeWidth={0.2} />
          ))}
          <rect x={cx + 16} y={cy - 3.5} width={5} height={7} rx={1} fill="#9ca3af" stroke="#6b7280" strokeWidth={0.4} />
          <rect x={cx - 5.5} y={y + h - 7} width={11} height={4} rx={1} fill="#1f2937" />
        </g>
      );
    case "sensor":
      return (
        <g filter="url(#dshadow)">
          <rect
            x={x + 1}
            y={y + 1.5}
            width={w - 12}
            height={h - 3}
            rx={(h - 3) / 2}
            fill="url(#steel)"
            stroke="#475569"
            strokeWidth={0.5}
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={x + 7 + i * 4.5} y1={y + 3} x2={x + 7 + i * 4.5} y2={y + h - 3} stroke="#94a3b8" strokeWidth={0.45} />
          ))}
          <rect x={x + 14} y={y + 2} width={7} height={h - 4} rx={0.8} fill="#6b7280" stroke="#475569" strokeWidth={0.3} />
          <rect x={x + 14} y={y + 2} width={7} height={0.9} fill="#cbd5e1" opacity={0.6} />
          <circle cx={x + 5} cy={cy} r={2.2} fill="#f59e0b" stroke="#b45309" strokeWidth={0.3} />
          <circle cx={x + 4.4} cy={cy - 0.6} r={0.8} fill="#fef3c7" />
          <rect x={x + w - 11} y={cy - 2.4} width={9} height={4.8} rx={1.2} fill="#374151" stroke="#1f2937" strokeWidth={0.3} />
          <text x={x + w - 6.5} y={cy + 1.2} textAnchor="middle" fontSize={3} fontFamily="monospace" fill="#cbd5e1">
            M12
          </text>
        </g>
      );
    case "stack":
      return (
        <g filter="url(#dshadow)">
          <rect x={cx - 2.4} y={y + 30} width={4.8} height={h - 32} rx={1} fill="url(#steel)" stroke="#6b7280" strokeWidth={0.35} />
          <rect x={cx - 9.5} y={y + h - 2} width={19} height={4} rx={1.6} fill="url(#darkcase)" stroke="#374151" strokeWidth={0.3} />
          {["#ef4444", "#f59e0b", "#22c55e"].map((c, i) => (
            <g key={i}>
              <rect x={cx - 6} y={y + 2 + i * 10.5} width={12} height={9} rx={2.4} fill={c} stroke="#7f1d1d" strokeWidth={0.3} />
              <rect x={cx - 4.6} y={y + 3.4 + i * 10.5} width={4.6} height={3} rx={1.4} fill="#ffffff" opacity={0.55} />
              <rect x={cx + 1.6} y={y + 4.4 + i * 10.5} width={2.6} height={4.8} rx={1.2} fill="#000000" opacity={0.12} />
            </g>
          ))}
          <path d={`M${cx - 6.4} ${y + 2} q 6.4 -4 12.8 0`} fill="none" stroke="#374151" strokeWidth={0.8} />
        </g>
      );
    case "hmi":
      return (
        <g filter="url(#dshadow)">
          {/* SIMATIC HMI KTP700 Basic：深灰近黑塑料边框 */}
          <rect x={x} y={y} width={w} height={h} rx={3} fill="url(#anthracite)" stroke="#0b1220" strokeWidth={0.9} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={0.9} rx={0.45} fill="#9ca3af" opacity={0.3} />
          <text x={x + 3.4} y={y + 7} fontSize={2.5} fontFamily="monospace" fill="#cbd5e1" letterSpacing="0.2">
            SIEMENS
          </text>
          {/* 深蓝渐变屏幕 */}
          <rect x={x + 3} y={y + 9} width={w - 6} height={h - 24} rx={0.9} fill="url(#screen)" stroke="#020617" strokeWidth={0.35} />
          <rect x={x + 3} y={y + 9} width={w - 6} height={h - 24} rx={0.9} fill="#1e40af" opacity={0.35} />
          <rect x={x + 3} y={y + 9} width={w - 6} height={(h - 24) * 0.42} rx={0.9} fill="url(#sheen)" opacity={0.5} />
          {/* 屏内白色画面元素 */}
          <rect x={x + 6} y={y + 12.4} width={w - 12} height={2.4} rx={0.5} fill="#e2e8f0" opacity={0.95} />
          <rect x={x + 6} y={y + 16.4} width={(w - 12) * 0.72} height={1.5} rx={0.4} fill="#cbd5e1" opacity={0.8} />
          <rect x={x + 6} y={y + 19.4} width={(w - 12) * 0.52} height={1.5} rx={0.4} fill="#cbd5e1" opacity={0.6} />
          <rect x={x + 6} y={y + 23} width={6} height={4.6} rx={0.4} fill="#f8fafc" opacity={0.85} />
          <rect x={x + 14} y={y + 21.4} width={4.6} height={6.2} rx={0.4} fill="#93c5fd" opacity={0.85} />
          <rect x={x + 20.6} y={y + 23.6} width={4.6} height={4} rx={0.4} fill="#60a5fa" opacity={0.8} />
          {/* F1–F4 功能键 */}
          {[0, 1, 2, 3].map((i) => {
            const kw = (w - 9) / 4;
            const kx = x + 3.6 + i * (kw + 0.6);
            return (
              <g key={i}>
                <rect x={kx} y={y + h - 13.6} width={kw} height={4.4} rx={0.7} fill="#4b5563" stroke="#1f2937" strokeWidth={0.3} />
                <text x={kx + kw / 2} y={y + h - 3.6} textAnchor="middle" fontSize={2.2} fontFamily="monospace" fill="#94a3b8">
                  {`F${i + 1}`}
                </text>
              </g>
            );
          })}
          <text x={x + w - 3.4} y={y + h - 0.9} textAnchor="end" fontSize={2.3} fontFamily="monospace" fill="#cbd5e1">
            KTP700
          </text>
        </g>
      );
    case "button":
      return (
        <g filter="url(#dshadow)">
          <rect x={x} y={y} width={w} height={h} rx={1.6} fill="url(#dface)" stroke="#94a3b8" strokeWidth={0.6} />
          <rect x={x + 1} y={y + 1} width={w - 2} height={0.9} fill="#ffffff" opacity={0.9} />
          {[
            { c: "#22c55e", i: 0 },
            { c: "#ef4444", i: 1 },
            { c: "#f59e0b", i: 2 },
          ].map(({ c, i }) => (
            <g key={i}>
              <circle cx={x + 15 + i * 18} cy={cy} r={6.6} fill="#cbd5e1" stroke="#6b7280" strokeWidth={0.5} />
              <circle cx={x + 15 + i * 18} cy={cy} r={5.3} fill={c} />
              <circle cx={x + 15 + i * 18} cy={cy} r={3} fill={c} opacity={0.9} />
              <ellipse cx={x + 13.3 + i * 18} cy={cy - 1.9} rx={2.1} ry={1.3} fill="#ffffff" opacity={0.5} />
            </g>
          ))}
          <circle cx={x + w - 13} cy={cy} r={7.2} fill="#facc15" stroke="#b45309" strokeWidth={0.5} />
          <circle cx={x + w - 13} cy={cy} r={6} fill="#b91c1c" stroke="#7f1d1d" strokeWidth={0.7} />
          <circle cx={x + w - 13} cy={cy - 0.8} r={4.5} fill="#dc2626" />
          <ellipse cx={x + w - 15} cy={cy - 2.6} rx={2.1} ry={1.4} fill="#ffffff" opacity={0.35} />
          <text x={x + w - 13} y={cy + 1.8} textAnchor="middle" fontSize={2.8} fontFamily="monospace" fontWeight={700} fill="#fef2f2">
            STOP
          </text>
        </g>
      );
    default:
      return <rect {...body} x={x} y={y} width={w} height={h} />;
  }
}

const WIRE_COLORS = ["#dc2626", "#f59e0b", "#2563eb", "#111827", "#16a34a", "#7c3aed"];

// 柜内仿真实配线：左右竖直线束 + 沿线槽的横向支路 + 扎带，绘制在元器件下层
function CabinetWiring({
  x,
  w,
  top,
  bottom,
  runs,
}: {
  x: number;
  w: number;
  top: number;
  bottom: number;
  runs: number[];
}) {
  const leftTrunk = x + 14;
  const rightTrunk = x + w - 14;
  return (
    <g opacity={0.58} pointerEvents="none">
      {WIRE_COLORS.map((color, i) => {
        const off = i * 1.1;
        return (
          <g key={`trunk-${i}`}>
            <path
              d={`M${leftTrunk + off} ${top} L${leftTrunk + off} ${bottom - 14} Q${leftTrunk + off} ${bottom - 4} ${
                leftTrunk + off + 7
              } ${bottom - 4}`}
              fill="none"
              stroke={color}
              strokeWidth={0.7}
              strokeLinecap="round"
            />
            <path
              d={`M${rightTrunk - off} ${top} L${rightTrunk - off} ${bottom - 26} Q${rightTrunk - off} ${bottom - 16} ${
                rightTrunk - off - 7
              } ${bottom - 16}`}
              fill="none"
              stroke={color}
              strokeWidth={0.7}
              strokeLinecap="round"
            />
          </g>
        );
      })}
      {/* 各线槽处的横向支路 */}
      {runs.map((y, ri) =>
        WIRE_COLORS.slice(0, 4).map((color, i) => (
          <path
            key={`run-${ri}-${i}`}
            d={`M${leftTrunk + i * 1.5} ${y + i * 1.2} L${x + 26 + i * 3} ${y + i * 1.2}`}
            fill="none"
            stroke={color}
            strokeWidth={0.7}
            strokeLinecap="round"
            opacity={0.85}
          />
        ))
      )}
      {/* 线束扎带 */}
      {Array.from({ length: Math.max(0, Math.floor((bottom - top) / 62)) }).map((_, i) => (
        <g key={`tie-${i}`}>
          <rect x={leftTrunk - 2} y={top + 34 + i * 62} width={11} height={2.1} rx={0.6} fill="#1f2937" opacity={0.5} />
          <rect x={rightTrunk - 9} y={top + 34 + i * 62} width={11} height={2.1} rx={0.6} fill="#1f2937" opacity={0.5} />
        </g>
      ))}
    </g>
  );
}

function CableEntry({ x, y, width, len = 92 }: { x: number; y: number; width: number; len?: number }) {
  const colors = ["#111827", "#7c3aed", "#0284c7", "#16a34a", "#ea580c", "#b45309"];
  const count = 6;
  return (
    <g>
      <rect x={x + 4} y={y + 4} width={width - 8} height={6} rx={1.4} fill="#9ca3af" stroke="#6b7280" strokeWidth={0.5} />
      {Array.from({ length: count }).map((_, i) => {
        const gx = x + 22 + (i * (width - 44)) / (count - 1);
        return (
          <g key={i}>
            <rect x={gx - 4} y={y + 8} width={8} height={5} rx={1} fill="#6b7280" />
            <path
              d={`M${gx} ${y + 13} C ${gx - 2} ${y + 13 + len * 0.36}, ${gx + 10} ${y + 13 + len * 0.63}, ${gx + 4} ${y + 13 + len}`}
              fill="none"
              stroke={colors[i]}
              strokeWidth={2.6}
              strokeLinecap="round"
              opacity={0.85}
            />
          </g>
        );
      })}
    </g>
  );
}

export default function CabinetDiagram() {
  const [hovered, setHovered] = useState<string | null>(null);
  const hoverProps = (key: string) => ({
    onMouseEnter: () => setHovered(key),
    onMouseLeave: () => setHovered(null),
    onFocus: () => setHovered(key),
    onBlur: () => setHovered(null),
  });

  return (
    <svg
      role="img"
      aria-label="Typical electrical control cabinet arrangement: DCS cabinet, PLC cabinet, communication cabinet and drive cabinet with clickable component callouts"
      viewBox={`0 ${VIEW_TOP} 1148 ${VIEW_H}`}
      className="block h-auto w-full min-w-0"
      fontFamily="ui-sans-serif, system-ui, 'Segoe UI', Arial, sans-serif"
    >
      <defs>
        <linearGradient id="plastic" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f2f5f9" />
          <stop offset="100%" stopColor="#dfe6ee" />
        </linearGradient>
        <linearGradient id="white" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#f1f4f8" />
          <stop offset="100%" stopColor="#d8e0e8" />
        </linearGradient>
        <linearGradient id="grey" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8ecf0" />
          <stop offset="42%" stopColor="#c9d2dc" />
          <stop offset="100%" stopColor="#a7b3c0" />
        </linearGradient>
        <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#dfe5ec" />
          <stop offset="100%" stopColor="#c3cbd5" />
        </linearGradient>
        <linearGradient id="darkmetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
        <linearGradient id="frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#4b5563" />
        </linearGradient>
        <linearGradient id="lam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d1d5db" />
          <stop offset="50%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#9ca3af" />
        </linearGradient>
        <linearGradient id="copper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6cf9c" />
          <stop offset="45%" stopColor="#d98b3f" />
          <stop offset="100%" stopColor="#9a5218" />
        </linearGradient>
        <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef3f8" />
          <stop offset="100%" stopColor="#d9e2eb" />
        </linearGradient>
        <linearGradient id="cabinet" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d7dde4" />
          <stop offset="12%" stopColor="#eef2f6" />
          <stop offset="88%" stopColor="#eef2f6" />
          <stop offset="100%" stopColor="#cfd6de" />
        </linearGradient>
        <radialGradient id="screw" cx="35%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="55%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
        <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8f9aa6" />
          <stop offset="16%" stopColor="#eef2f6" />
          <stop offset="48%" stopColor="#c9d2db" />
          <stop offset="78%" stopColor="#eef2f6" />
          <stop offset="100%" stopColor="#8f9aa6" />
        </linearGradient>
        <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="40%" stopColor="#0b1220" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="darkcase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="55%" stopColor="#303945" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
        <linearGradient id="bluecase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eff6ff" />
          <stop offset="50%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
        <linearGradient id="pcb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#15803d" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <linearGradient id="copperwire" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="35%" stopColor="#f6cf9c" />
          <stop offset="65%" stopColor="#d98b3f" />
          <stop offset="100%" stopColor="#9a5218" />
        </linearGradient>
        <linearGradient id="partShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="10%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="34%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="68%" stopColor="#0f172a" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id="partSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.36" />
          <stop offset="7%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="93%" stopColor="#0f172a" stopOpacity="0" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="anthracite" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#59626e" />
          <stop offset="45%" stopColor="#3a424d" />
          <stop offset="100%" stopColor="#232a33" />
        </linearGradient>
        <linearGradient id="caseLight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbfcfd" />
          <stop offset="55%" stopColor="#eef2f6" />
          <stop offset="100%" stopColor="#d6dee6" />
        </linearGradient>
        <linearGradient id="dface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="55%" stopColor="#e9eef4" />
          <stop offset="100%" stopColor="#c8d1db" />
        </linearGradient>
        <linearGradient id="dbody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f6f9" />
          <stop offset="55%" stopColor="#d8dee6" />
          <stop offset="100%" stopColor="#a9b3bf" />
        </linearGradient>
        <pattern id="holes" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="0.45" fill="#d5dce4" />
        </pattern>
        <filter id="soft" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0.9" dy="1.5" stdDeviation="1.1" floodColor="#0b1220" floodOpacity="0.4" />
        </filter>
        <filter id="dshadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0.8" dy="1.3" stdDeviation="1" floodColor="#0b1220" floodOpacity="0.38" />
        </filter>
        <filter id="glow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="cabshadow" x="-10%" y="-10%" width="125%" height="125%">
          <feDropShadow dx="3" dy="5" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.18" />
        </filter>
        <linearGradient id="cabVignetteTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cabVignetteBottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" stopOpacity="0" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="cabVignetteLeft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0f172a" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cabVignetteRight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0f172a" stopOpacity="0" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.16" />
        </linearGradient>
        {/* 实物图仅外缘渐隐透明，保留产品主体清晰 */}
        <radialGradient id="fadeAll" cx="50%" cy="50%" r="50%">
          <stop offset="0.85" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <mask id="prodFade" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
          <rect x="0" y="0" width="1" height="1" fill="url(#fadeAll)" />
        </mask>
      </defs>

      <rect x="0" y={VIEW_TOP} width="1148" height={VIEW_H} fill="#ffffff" />

      {/* 柜外引线：三段式（pill → 垂直到走廊 → 水平到元器件x → 垂直到柜边） */}
      {CABINETS.map((c) => (
        <g key={`leaders-${c.id}`}>
          {layoutLabels(c, LABEL_CFG).map((slot) => {
            const p = slot.part;
            const active = hovered === p.key;
            const sx = slot.x + 8;
            const px = Math.min(c.x + CAB_W - 13, Math.max(c.x + 13, p.x + p.w / 2));
            const d = slot.above
              ? `M ${sx} ${slot.y + PILL_H} L ${sx} ${CAB_TOP - 5} L ${px} ${CAB_TOP - 5} L ${px} ${CAB_TOP}`
              : `M ${sx} ${slot.y} L ${sx} ${CAB_BOTTOM + 5} L ${px} ${CAB_BOTTOM + 5} L ${px} ${CAB_BOTTOM}`;
            return (
              <g key={`lead-${c.id}-${p.key}`}>
                <path
                  d={d}
                  fill="none"
                  stroke={active ? c.accent : "#94a3b8"}
                  strokeWidth={active ? 1.7 : 0.7}
                  opacity={active ? 1 : 0.7}
                  strokeLinejoin="round"
                />
                <circle cx={px} cy={slot.above ? CAB_TOP - 5 : CAB_BOTTOM + 5} r={active ? 2.4 : 1.6} fill={c.accent} opacity={active ? 1 : 0.7} />
              </g>
            );
          })}
        </g>
      ))}

      {CABINETS.map((c) => (
        <g key={c.id} filter="url(#cabshadow)">
          <ellipse cx={c.x + CAB_W / 2} cy={CAB_BOTTOM + 8} rx={CAB_W / 2 - 6} ry={5} fill="#0f172a" opacity={0.1} />
          <rect x={c.x - 4} y={CAB_BOTTOM - 14} width={CAB_W + 8} height={14} rx={2} fill="#8b95a1" stroke="#6b7280" strokeWidth={0.8} />
          <rect x={c.x} y={CAB_TOP} width={CAB_W} height={CAB_H} rx={3} fill="url(#cabinet)" stroke="#77828f" strokeWidth={1.6} />
          <rect x={c.x + 5} y={CAB_TOP + 5} width={CAB_W - 10} height={CAB_H - 12} rx={2} fill="#dfe5ec" stroke="#b8c2cc" strokeWidth={1} />
          <rect x={c.x + 9} y={CAB_TOP + 38} width={CAB_W - 18} height={CAB_H - 52} fill="url(#plate)" stroke="#c3ccd6" strokeWidth={0.8} />
          <rect x={c.x + 9} y={CAB_TOP + 38} width={CAB_W - 18} height={CAB_H - 52} fill="url(#holes)" opacity={0.7} />
          {/* 柜体开口上下暗角，增强纵深感 */}
          <rect x={c.x + 9} y={CAB_TOP + 38} width={CAB_W - 18} height={22} fill="url(#cabVignetteTop)" />
          <rect x={c.x + 9} y={CAB_BOTTOM - 32} width={CAB_W - 18} height={24} fill="url(#cabVignetteBottom)" />
          <rect x={c.x + 9} y={CAB_TOP + 38} width={14} height={CAB_H - 52} fill="url(#cabVignetteLeft)" />
          <rect x={c.x + CAB_W - 23} y={CAB_TOP + 38} width={14} height={CAB_H - 52} fill="url(#cabVignetteRight)" />
          {/* 顶部楣头下沿阴影 */}
          <rect x={c.x + 5} y={CAB_TOP + 35} width={CAB_W - 10} height={3} fill="#0f172a" opacity={0.12} />
          <rect x={c.x} y={CAB_TOP} width={CAB_W} height={36} rx={3} fill={HEADER_TINT[c.accent] ?? "#e2e8f0"} />
          <rect x={c.x + 1} y={CAB_TOP + 1} width={CAB_W - 2} height={3} fill={c.accent} />
          <text
            x={c.x + CAB_W / 2}
            y={CAB_TOP + 16}
            textAnchor="middle"
            fontSize={11.5}
            fontWeight={700}
            fill={HEADER_TEXT[c.accent] ?? "#0f172a"}
          >
            {c.title}
          </text>
          <text x={c.x + CAB_W / 2} y={CAB_TOP + 28} textAnchor="middle" fontSize={7.4} fill="#475569">
            {c.subtitle}
          </text>

          {/* 两侧竖直走线槽 */}
          <rect x={c.x + 10} y={CAB_TOP + 44} width={8} height={CAB_H - 152} rx={1} fill="url(#grey)" stroke="#b6c2cf" strokeWidth={0.5} />
          <rect x={c.x + CAB_W - 18} y={CAB_TOP + 44} width={8} height={CAB_H - 152} rx={1} fill="url(#grey)" stroke="#b6c2cf" strokeWidth={0.5} />
          {Array.from({ length: Math.floor((CAB_H - 152) / 11) }).map((_, i) => (
            <g key={i}>
              <line x1={c.x + 11} y1={CAB_TOP + 50 + i * 11} x2={c.x + 17} y2={CAB_TOP + 50 + i * 11} stroke="#f8fafc" strokeWidth={1.7} />
              <line x1={c.x + CAB_W - 17} y1={CAB_TOP + 50 + i * 11} x2={c.x + CAB_W - 11} y2={CAB_TOP + 50 + i * 11} stroke="#f8fafc" strokeWidth={1.7} />
            </g>
          ))}

          {/* 顶部铜母排 */}
          <rect x={c.x + 10} y={CAB_TOP + 41} width={CAB_W - 20} height={6} rx={1} fill="url(#copper)" stroke="#8a4a12" strokeWidth={0.5} />
          <rect x={c.x + 10} y={CAB_TOP + 41} width={CAB_W - 20} height={1.6} fill="#ffe0b5" opacity={0.5} />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={c.x + 30 + i * 44} cy={CAB_TOP + 44} r={1.3} fill="#7c2d12" />
          ))}

          <CabinetWiring
            x={c.x}
            w={CAB_W}
            top={CAB_TOP + 49}
            bottom={CAB_BOTTOM - 22}
            runs={c.parts.filter((p) => p.kind === "duct").map((p) => p.y + p.h / 2)}
          />

          {/* 柜内引线：铜母排 / 柜底 → 元器件边缘（绘制在元器件下层） */}
          {layoutLabels(c, LABEL_CFG).map((slot) => {
            const p = slot.part;
            const px = p.x + p.w / 2;
            if (px <= c.x || px >= c.x + CAB_W) return null;
            const active = hovered === p.key;
            const dotY = slot.above ? p.y - 3 : p.y + p.h + 3;
            const fromY = slot.above ? CAB_TOP + 46 : dotY;
            const toY = slot.above ? dotY : CAB_BOTTOM - 6;
            return (
              <g key={`inner-${c.id}-${p.key}`}>
                <line
                  x1={px}
                  y1={Math.min(fromY, toY)}
                  x2={px}
                  y2={Math.max(fromY, toY)}
                  stroke={c.accent}
                  strokeWidth={active ? 1.4 : 0.7}
                  opacity={active ? 0.9 : 0.45}
                />
                <circle cx={px} cy={dotY} r={3.2} fill="none" stroke={c.accent} strokeWidth={0.45} opacity={active ? 0.7 : 0.32} />
                <circle cx={px} cy={dotY} r={1.8} fill="#ffffff" opacity={0.9} />
                <circle cx={px} cy={dotY} r={active ? 1.5 : 1.1} fill={c.accent} />
              </g>
            );
          })}

          {[...c.parts]
            .sort((a, b) => Number(a.key === hovered) - Number(b.key === hovered))
            .map((p) => {
              const label = c.labels.find((l) => l.part === p.key);
              const active = hovered === p.key;
              const shape = (
                <g>
                  {NO_SHADE.includes(p.kind) ? null : (
                    <ellipse
                      cx={p.x + p.w / 2}
                      cy={p.y + p.h + 2.4}
                      rx={p.w * 0.5}
                      ry={2.6}
                      fill="#0f172a"
                      opacity={0.18}
                    />
                  )}
                  <PartShape part={p} accent={c.accent} />
                  {NO_SHADE.includes(p.kind) ? null : (
                    <PartShade x={p.x} y={p.y} w={p.w} h={p.h} rx={SHADE_RX[p.kind] ?? 1.6} />
                  )}
                  {p.kind === "rail" && p.y > 850 && p.y < 880 ? (
                    <text x={p.x + 6} y={p.y + 7} fontSize={5.4} fill="#7c2d12" fontWeight={700}>
                      PE
                    </text>
                  ) : null}
                </g>
              );
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
                      <rect
                        x={p.x - 3}
                        y={p.y - 3}
                        width={p.w + 6}
                        height={p.h + 6}
                        rx={3}
                        fill={c.accent}
                        opacity={0.3}
                        filter="url(#glow)"
                      />
                      <rect
                        x={p.x - 1.4}
                        y={p.y - 1.4}
                        width={p.w + 2.8}
                        height={p.h + 2.8}
                        rx={2.6}
                        fill="none"
                        stroke={c.accent}
                        strokeWidth={1.3}
                      />
                    </g>
                  ) : null}
                  {shape}
                </g>
              );
              return label ? (
                <a key={p.key} href={label.href} aria-label={label.text} className="cursor-pointer" {...hoverProps(p.key)}>
                  {body}
                </a>
              ) : (
                <g key={p.key}>{body}</g>
              );
            })}

          <CableEntry x={c.x} y={CAB_BOTTOM - 50} width={CAB_W} len={30} />
        </g>
      ))}

      {CABINETS.map((c) => (
        <g key={`labels-${c.id}`}>
          {layoutLabels(c, LABEL_CFG).map((slot) => {
            const active = hovered === slot.part.key;
            const pw = slot.label.text.length * 4.8 + 14;
            return (
              <a
                key={`${c.id}-lbl-${slot.part.key}`}
                href={slot.label.href}
                aria-label={slot.label.text}
                className="cursor-pointer"
                {...hoverProps(slot.part.key)}
              >
                <rect
                  x={slot.x}
                  y={slot.y - 9}
                  width={pw}
                  height={PILL_H}
                  rx={6}
                  fill={active ? c.accent : (HEADER_TINT[c.accent] ?? "#e2e8f0")}
                  stroke={c.accent}
                  strokeWidth={active ? 1.3 : 0.7}
                  opacity={active ? 1 : 0.95}
                />
                <text
                  x={slot.x + 6.5}
                  y={slot.y + 0.3}
                  fontSize={8.2}
                  fontWeight={active ? 700 : 500}
                  fill={active ? "#ffffff" : (HEADER_TEXT[c.accent] ?? "#0f172a")}
                >
                  {slot.label.text}
                </text>
              </a>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

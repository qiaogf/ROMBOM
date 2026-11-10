"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

/** 12 类产品各用一套明显区分的颜色：line = 引线/边框，tint = 名称框填充，text = 文字 */
type Accent =
  | "blue"
  | "violet"
  | "fuchsia"
  | "emerald"
  | "teal"
  | "lime"
  | "amber"
  | "indigo"
  | "orange"
  | "cyan"
  | "rose"
  | "purple";

interface Palette {
  line: string;
  tint: string;
  text: string;
}

const PALETTE: Record<Accent, Palette> = {
  blue: { line: "#2563eb", tint: "#dbeafe", text: "#1e3a8a" },
  violet: { line: "#7c3aed", tint: "#ede9fe", text: "#4c1d95" },
  fuchsia: { line: "#c026d3", tint: "#fae8ff", text: "#701a75" },
  emerald: { line: "#059669", tint: "#d1fae5", text: "#064e3b" },
  teal: { line: "#0d9488", tint: "#ccfbf1", text: "#134e4a" },
  lime: { line: "#65a30d", tint: "#ecfccb", text: "#365314" },
  amber: { line: "#d97706", tint: "#fef3c7", text: "#78350f" },
  indigo: { line: "#4f46e5", tint: "#e0e7ff", text: "#312e81" },
  orange: { line: "#ea580c", tint: "#ffedd5", text: "#7c2d12" },
  cyan: { line: "#0891b2", tint: "#cffafe", text: "#164e63" },
  rose: { line: "#e11d48", tint: "#ffe4e6", text: "#881337" },
  purple: { line: "#9333ea", tint: "#f3e8ff", text: "#581c87" },
};

interface PartLink {
  label: string;
  href: string;
}

interface Callout {
  id: string;
  name: string;
  href: string;
  accent: Accent;
  side: "left" | "right";
  /** leader dot position on the device */
  dot: [number, number];
  /** 高亮圆角框中心，默认与 dot 相同；设备较长时可把框整体对齐本体 */
  box?: [number, number];
  /** hover hotspot radius over the device */
  radius: number;
  /** 产品本体轮廓多边形（"x,y x,y ..."，SVG viewBox 坐标，沿设备可见边缘描点） */
  outline: string;
  parts: PartLink[];
}

const VIEW_W = 2360;
const VIEW_H = 1000;
const IMG_X = 360;
const IMG_Y = 36;
const IMG_W = 1640;
const IMG_H = 922;

const PILL_H = 36;
const PILL_RX = 9;
const FONT = 19;
const PILL_GAP = 4;
const PART_STEP = PILL_H + PILL_GAP;

const LEFT_DEV_X = 30;
const LEFT_PART_X = 46;
const RIGHT_DEV_X = 2030;
const RIGHT_PART_X = 2014;

const BAND_TOP = IMG_Y + 8;
const BAND_BOTTOM = IMG_Y + IMG_H - 8;

const IMG_SRC = "/images/line/hero-line-v17.webp";

const CALLOUTS: Callout[] = [
  /* ---------------- left column ---------------- */
  {
    id: "cnc",
    name: "CNC Machining",
    href: "/category/cnc-robot",
    accent: "blue",
    side: "left",
    dot: [956, 258],
    radius: 88,
    outline: "902,189 953,177 1001,181 1011,201 1009,288 1014,315 1001,335 926,339 906,319 898,272 900,221",
    parts: [
      { label: "Lathe · Milling · Grinding", href: "/category/cnc-robot" },
      { label: "5-Axis · Drill · Spindle", href: "/category/mechanical" },
    ],
  },
  {
    id: "sixaxis",
    name: "Six-Axis Robot",
    href: "/category/cnc-robot",
    accent: "violet",
    side: "left",
    dot: [712, 312],
    radius: 72,
    outline: "673,270 705,262 728,274 736,310 752,321 748,345 734,389 714,395 677,393 665,349 667,310",
    parts: [
      { label: "6-Axis · Cobot · Reducer", href: "/category/cnc-robot" },
      { label: "Servo · Encoder · Gripper", href: "/category/drive" },
    ],
  },
  {
    id: "assembly",
    name: "Assembly Station",
    href: "/category/cnc-robot",
    accent: "fuchsia",
    side: "left",
    dot: [958, 478],
    radius: 80,
    outline: "892,423 919,411 939,431 963,415 993,407 1014,427 1010,482 1018,526 1006,560 888,560 876,502 880,455",
    parts: [
      { label: "Robot Assembly Cell", href: "/category/custom-service" },
      { label: "Dispenser · Screwdriver", href: "/category/mechanical" },
    ],
  },
  {
    id: "scara",
    name: "SCARA Robot",
    href: "/category/cnc-robot",
    accent: "emerald",
    side: "left",
    dot: [711, 545],
    radius: 70,
    outline: "674,502 705,494 737,498 749,518 741,557 759,561 762,613 749,623 666,623 656,565 672,557 667,522",
    parts: [
      { label: "SCARA · Linear Module", href: "/category/mechanical" },
      { label: "Vacuum · Pneumatic Gripper", href: "/category/fluid" },
    ],
  },
  {
    id: "loading",
    name: "Loading Conveyor",
    href: "/category/mechanical",
    accent: "teal",
    side: "left",
    dot: [534, 688],
    box: [534, 731],
    radius: 108,
    outline: "439,648 614,623 629,640 626,670 618,835 598,835 597,686 508,714 505,824 486,822 484,725 444,710",
    parts: [
      { label: "Belt · Roller · Guide Rail", href: "/category/mechanical" },
      { label: "Buffer · Stopper · Sensor", href: "/category/sensor" },
    ],
  },
  {
    id: "agv",
    name: "AGV",
    href: "/category/mechanical",
    accent: "lime",
    side: "left",
    dot: [1113, 844],
    radius: 80,
    outline: "1047,801 1106,793 1178,801 1187,841 1184,876 1166,892 1059,894 1042,868 1039,829",
    parts: [
      { label: "AGV · AMR Chassis", href: "/category/mechanical" },
      { label: "LiDAR · Battery · Drive", href: "/category/drive" },
    ],
  },

  /* ---------------- right column ---------------- */
  {
    id: "delta",
    name: "Delta Robot",
    href: "/category/cnc-robot",
    accent: "amber",
    side: "right",
    dot: [1683, 250],
    box: [1693, 308],
    radius: 125,
    outline: "1606,189 1785,189 1788,211 1767,215 1769,427 1750,428 1748,230 1702,223 1734,302 1718,317 1695,270 1671,310 1639,310 1655,246 1617,223 1615,420 1598,418 1600,211",
    parts: [
      { label: "Delta · Spider Robot", href: "/category/cnc-robot" },
      { label: "Vacuum Gripper · Tracking", href: "/category/sensor" },
    ],
  },
  {
    id: "conveyor",
    name: "Conveyor Line",
    href: "/category/mechanical",
    accent: "indigo",
    side: "right",
    dot: [1462, 228],
    box: [1457, 266],
    radius: 108,
    outline: "1319,246 1473,226 1595,222 1598,250 1596,308 1473,293 1323,309 1315,277",
    parts: [
      { label: "Oval Loop · Roller · Pallet", href: "/category/mechanical" },
      { label: "Drive Motor · Reducer", href: "/category/drive" },
    ],
  },
  {
    id: "unloading",
    name: "Unloading Conveyor",
    href: "/category/mechanical",
    accent: "orange",
    side: "right",
    dot: [1822, 386],
    box: [1826, 416],
    radius: 92,
    outline: "1746,347 1901,341 1912,358 1905,392 1899,483 1883,487 1880,408 1791,424 1787,491 1771,490 1769,420 1743,400 1739,365",
    parts: [
      { label: "Belt · Roller · Motor", href: "/category/mechanical" },
      { label: "Guide Rail · Stopper", href: "/category/mechanical" },
    ],
  },
  {
    id: "vision",
    name: "Vision Inspection",
    href: "/category/sensor",
    accent: "cyan",
    side: "right",
    dot: [1282, 392],
    box: [1290, 402],
    radius: 62,
    outline: "1260,368 1302,362 1311,379 1305,398 1291,400 1297,429 1330,435 1335,457 1319,465 1274,460 1270,433 1280,400 1256,390",
    parts: [
      { label: "Camera · Lens · Ring Light", href: "/category/sensor" },
      { label: "AI Inspection Software", href: "/category/control" },
    ],
  },
  {
    id: "fluid",
    name: "Pneumatic & Hydraulic",
    href: "/category/fluid",
    accent: "rose",
    side: "right",
    dot: [1544, 692],
    radius: 95,
    outline: "1455,608 1495,610 1498,671 1517,656 1599,652 1636,668 1637,741 1621,757 1519,758 1498,744 1495,776 1459,776 1452,719 1451,652",
    parts: [
      { label: "Compressor · Tank · FRL", href: "/category/mechanical" },
      { label: "Valve · Cylinder · HPU", href: "/category/fluid" },
    ],
  },
  {
    id: "control",
    name: "Control & Drive",
    href: "/category/control",
    accent: "purple",
    side: "right",
    dot: [1339, 771],
    radius: 100,
    outline: "1230,705 1438,693 1447,713 1446,820 1430,843 1248,847 1230,816",
    parts: [
      { label: "PLC · HMI · VFD · Servo", href: "/category/control" },
      { label: "MCCB · Busbar · PSU", href: "/category/electrical" },
    ],
  },
];

const pillWidth = (text: string) => text.length * 10.6 + 30;
const boxCenter = (c: Callout): [number, number] => c.box ?? c.dot;
const stackHeight = (c: Callout) => PILL_H + PILL_GAP + c.parts.length * PART_STEP - PILL_GAP;

/** Vertically stack one column of callouts to fill the image band. */
function layoutColumn(side: "left" | "right") {
  const items = CALLOUTS.filter((c) => c.side === side).sort((a, b) => a.dot[1] - b.dot[1]);
  const total = items.reduce((sum, c) => sum + stackHeight(c), 0);
  const gap = (BAND_BOTTOM - BAND_TOP - total) / Math.max(items.length - 1, 1);
  let cursor = BAND_TOP;
  return items.map((c) => {
    const top = cursor;
    cursor += stackHeight(c) + gap;
    return { callout: c, top };
  });
}

/** Orthogonal polyline with rounded elbows — no diagonal leader lines. */
function orthPath(points: Array<[number, number]>, radius = 12): string {
  if (points.length < 2) return "";
  const r1 = (n: number) => Math.round(n * 10) / 10;
  let d = `M ${r1(points[0][0])} ${r1(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const lenIn = Math.hypot(cx - px, cy - py);
    const lenOut = Math.hypot(nx - cx, ny - cy);
    if (!lenIn || !lenOut) continue;
    const rr = Math.min(radius, lenIn / 2, lenOut / 2);
    const ax = cx + ((px - cx) / lenIn) * rr;
    const ay = cy + ((py - cy) / lenIn) * rr;
    const bx = cx + ((nx - cx) / lenOut) * rr;
    const by = cy + ((ny - cy) / lenOut) * rr;
    d += ` L ${r1(ax)} ${r1(ay)} Q ${r1(cx)} ${r1(cy)} ${r1(bx)} ${r1(by)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${r1(last[0])} ${r1(last[1])}`;
  return d;
}

function Pill({
  x,
  y,
  width,
  label,
  href,
  accent,
  on,
  solid,
  bold,
  selfOn,
  onEnter,
  onLeave,
  onDown,
  onUp,
  onOpen,
}: {
  x: number;
  y: number;
  width: number;
  label: string;
  href: string;
  accent: Accent;
  on: boolean;
  solid: boolean;
  bold: boolean;
  /** 鼠标直接停在这个胶囊上（零部件自身也要高亮，与产品/引线无关） */
  selfOn: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onDown: () => void;
  onUp: () => void;
  onOpen: (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const filled = selfOn || (on && solid);
  const onStroke = on || selfOn;
  const pal = PALETTE[accent];
  return (
    <a
      href={href}
      aria-label={label}
      className="cursor-pointer"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onClick={onOpen}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={PILL_H}
        rx={PILL_RX}
        fill={filled ? pal.line : pal.tint}
        stroke={pal.line}
        strokeWidth={onStroke ? 1.8 : 1}
      />
      <text
        x={x + 15}
        y={y + PILL_H / 2 + 6.8}
        fontSize={FONT}
        fontWeight={onStroke || bold ? 600 : 500}
        fill={filled ? "#ffffff" : pal.text}
      >
        {label}
      </text>
    </a>
  );
}

export default function ProductionLineHero() {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  /** 直接悬停/按下的那个胶囊（名称或零部件），零部件自身也要实心高亮 */
  const [hot, setHot] = useState<string | null>(null);
  const columns = [...layoutColumn("left"), ...layoutColumn("right")];

  /** Highlight while hovering or while the pointer is held down (click feedback). */
  const isOn = (id: string) => active === id || pressed === id;

  /** Plain left click → client-side navigation; modifier/middle click keeps browser defaults. */
  const openLink = (e: MouseEvent<Element>, href: string) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.push(href);
  };

  const press = (id: string) => () => setPressed(id);
  const release = () => setPressed(null);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="w-full h-auto block bg-white"
      role="img"
      aria-label="Automated flexible manufacturing closed-loop line with clickable product callouts"
    >
      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="#ffffff" />

      {/* ---------- factory render ---------- */}
      <image
        href={IMG_SRC}
        x={IMG_X}
        y={IMG_Y}
        width={IMG_W}
        height={IMG_H}
        preserveAspectRatio="xMidYMid slice"
      />
      <rect
        x={IMG_X}
        y={IMG_Y}
        width={IMG_W}
        height={IMG_H}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="1.5"
      />

      <defs>
        {/* 提亮产品本体像素：亮度/饱和度提升 + 柔白光晕，配径向渐变蒙版做柔和过渡，无几何边界 */}
        <filter id="hero-pop" x="-12%" y="-12%" width="124%" height="124%">
          <feComponentTransfer result="bright">
            <feFuncR type="linear" slope="1.38" intercept="0.09" />
            <feFuncG type="linear" slope="1.38" intercept="0.09" />
            <feFuncB type="linear" slope="1.38" intercept="0.09" />
          </feComponentTransfer>
          <feColorMatrix in="bright" type="saturate" values="1.4" result="sat" />
          <feDropShadow in="sat" dx="0" dy="0" stdDeviation="7" floodColor="#ffffff" floodOpacity="0.85" />
        </filter>
        {/* 轮廓蒙版边缘柔化 */}
        <filter id="hero-mask-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* ---------- leader lines ---------- */}
      {columns.map(({ callout: c, top }) => {
        const right = c.side === "right";
        const on = isOn(c.id);
        // 只有鼠标停在产品名称、零部件或图中设备上时才显示该产品的引线
        if (!on) return null;
        const w = pillWidth(c.name);
        const ly = top + PILL_H / 2;
        const start: [number, number] = right
          ? [RIGHT_DEV_X - 8, ly]
          : [LEFT_DEV_X + w + 8, ly];
        const bendX = right ? c.dot[0] + 90 : c.dot[0] - 90;
        const d = orthPath([start, [bendX, ly], [bendX, c.dot[1]], c.dot]);
        const pal = PALETTE[c.accent];
        return (
          <g key={`lead-${c.id}`}>
            <path
              d={d}
              fill="none"
              stroke="#ffffff"
              strokeWidth={on ? 6 : 4}
              opacity={on ? 0.95 : 0.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={d}
              fill="none"
              stroke={pal.line}
              strokeWidth={on ? 2.6 : 1.7}
              opacity={on ? 1 : 0.95}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={c.dot[0]} cy={c.dot[1]} r={on ? 4 : 3.2} fill="#ffffff" opacity={0.9} />
            <circle cx={c.dot[0]} cy={c.dot[1]} r={on ? 2.6 : 2} fill={pal.line} opacity={1} />
          </g>
        );
      })}

      {/* ---------- product self highlight: 本体像素提亮 + 与引线同色的圆角边框 ---------- */}
      {columns.map(({ callout: c }) =>
        isOn(c.id) ? (
          <g key={`pop-${c.id}`} pointerEvents="none">
            <mask id={`hero-mask-${c.id}`}>
              <polygon points={c.outline} fill="#ffffff" filter="url(#hero-mask-blur)" />
            </mask>
            <image
              href={IMG_SRC}
              x={IMG_X}
              y={IMG_Y}
              width={IMG_W}
              height={IMG_H}
              preserveAspectRatio="xMidYMid slice"
              filter="url(#hero-pop)"
              mask={`url(#hero-mask-${c.id})`}
              style={{
                transformBox: "view-box",
                transformOrigin: `${boxCenter(c)[0]}px ${boxCenter(c)[1]}px`,
                transform: "scale(1.05)",
              }}
            />
            {/* 产品圆角边框：颜色与引线一致 */}
            <rect
              x={boxCenter(c)[0] - c.radius}
              y={boxCenter(c)[1] - c.radius}
              width={c.radius * 2}
              height={c.radius * 2}
              rx={c.radius * 0.32}
              fill="none"
              stroke="#ffffff"
              strokeWidth={6}
              opacity={0.75}
            />
            <rect
              x={boxCenter(c)[0] - c.radius}
              y={boxCenter(c)[1] - c.radius}
              width={c.radius * 2}
              height={c.radius * 2}
              rx={c.radius * 0.32}
              fill="none"
              stroke={PALETTE[c.accent].line}
              strokeWidth={2.8}
            />
          </g>
        ) : null
      )}

      {/* ---------- device hover / click hotspots（与高亮区域同范围，整块可点） ---------- */}
      {columns.map(({ callout: c }) => (
        <rect
          key={`hit-${c.id}`}
          x={boxCenter(c)[0] - c.radius}
          y={boxCenter(c)[1] - c.radius}
          width={c.radius * 2}
          height={c.radius * 2}
          rx={c.radius * 0.32}
          fill="transparent"
          style={{ cursor: "pointer" }}
          onMouseEnter={() => setActive(c.id)}
          onMouseLeave={() => {
            setActive(null);
            setPressed(null);
          }}
          onPointerDown={press(c.id)}
          onPointerUp={release}
          onClick={(e) => openLink(e, c.href)}
        />
      ))}

      {/* ---------- labels ---------- */}
      {columns.map(({ callout: c, top }) => {
        const right = c.side === "right";
        const devX = right ? RIGHT_DEV_X : LEFT_DEV_X;
        const partX = right ? RIGHT_PART_X : LEFT_PART_X;
        const groupOn = isOn(c.id);
        const clear = () => {
          setActive(null);
          setPressed(null);
          setHot(null);
        };
        const down = press(c.id);
        const nameKey = `${c.id}@name`;
        const nameEnter = () => {
          setActive(c.id);
          setHot(nameKey);
        };
        // 悬停零部件时产品名称不实心（只亮引线+产品）；悬停名称本身或图中设备时才实心
        const nameSolid = hot === null || hot === nameKey;
        return (
          <g key={c.id}>
            <Pill
              x={devX}
              y={top}
              width={pillWidth(c.name)}
              label={c.name}
              href={c.href}
              accent={c.accent}
              on={groupOn}
              solid={nameSolid}
              bold
              selfOn={hot === nameKey}
              onEnter={nameEnter}
              onLeave={clear}
              onDown={down}
              onUp={release}
              onOpen={(e) => openLink(e, c.href)}
            />
            {c.parts.map((p, i) => {
              const key = `${c.id}@${i}`;
              return (
                <Pill
                  key={p.label}
                  x={partX}
                  y={top + PILL_H + PILL_GAP + i * PART_STEP}
                  width={pillWidth(p.label)}
                  label={p.label}
                  href={p.href}
                  accent={c.accent}
                  on={groupOn}
                  solid={false}
                  bold={false}
                  selfOn={hot === key}
                  onEnter={() => {
                    setActive(c.id);
                    setHot(key);
                  }}
                  onLeave={clear}
                  onDown={() => {
                    setPressed(c.id);
                    setHot(key);
                  }}
                  onUp={release}
                  onOpen={(e) => openLink(e, p.href)}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

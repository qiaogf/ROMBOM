"use client";

// 首页两张机柜示意图（各 ~90KB 源码、编译后为独立 client chunk）。
// 用 ssr:false 拆出首屏水合路径，等浏览器空闲时再拉取渲染；
// 占位骨架按原 SVG viewBox 宽高比设置，避免加载后布局抖动。
import dynamic from "next/dynamic";

function DiagramSkeleton({ aspect }: { aspect: string }) {
  return (
    <div
      className="w-full bg-slate-100 animate-pulse"
      style={{ aspectRatio: aspect }}
      aria-hidden="true"
    />
  );
}

// CabinetDiagram viewBox="0 232 1148 950" → 宽高比 1148/950
export const LazyCabinetDiagram = dynamic(
  () => import("@/components/cabinet/CabinetDiagram"),
  {
    ssr: false,
    loading: () => <DiagramSkeleton aspect="1148 / 950" />,
  }
);

// DistributionDiagram viewBox="0 120 1148 1010" → 宽高比 1148/1010
export const LazyDistributionDiagram = dynamic(
  () => import("@/components/cabinet/DistributionDiagram"),
  {
    ssr: false,
    loading: () => <DiagramSkeleton aspect="1148 / 1010" />,
  }
);

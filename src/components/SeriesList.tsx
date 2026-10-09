import { Layers } from "lucide-react";
import type { SeriesInfo } from "@/lib/db-service";

interface SeriesListProps {
  series: SeriesInfo[];
  title?: string;
}

/**
 * 通用系列标签列表（无交互，纯展示系列分组名）
 */
export function SeriesList({
  series,
  title = "Product Series",
}: SeriesListProps) {
  if (series.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5" />
        {title}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {series.map((item) => (
          <span
            key={item.seriesName}
            className="px-2.5 py-1 text-[11px] bg-green-50 text-green-700 rounded border border-green-200 font-medium"
          >
            {item.seriesName}
          </span>
        ))}
      </div>
    </div>
  );
}

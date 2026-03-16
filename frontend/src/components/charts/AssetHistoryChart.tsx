"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AssetDataPoint, DateRange } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils/format";

interface AssetHistoryChartProps {
  data: AssetDataPoint[];
  loading?: boolean;
}

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: "1週", value: "1w" },
  { label: "1ヶ月", value: "1m" },
  { label: "3ヶ月", value: "3m" },
  { label: "6ヶ月", value: "6m" },
  { label: "1年", value: "1y" },
  { label: "3年", value: "3y" },
  { label: "全期間", value: "all" },
];

const SERIES = [
  { key: "total_assets", label: "総資産", color: "#0F62FE", stackId: "a" },
  { key: "total_liabilities", label: "負債", color: "#6B7280", stackId: "b" },
];

function filterByRange(data: AssetDataPoint[], range: DateRange): AssetDataPoint[] {
  if (range === "all") return data;
  const now = new Date();
  const daysMap: Record<DateRange, number> = {
    "1w": 7, "1m": 30, "3m": 90, "6m": 180,
    "1y": 365, "3y": 1095, "5y": 1825, "all": 0,
  };
  const cutoff = new Date(now.getTime() - daysMap[range] * 86400_000);
  return data.filter((d) => new Date(d.date) >= cutoff);
}

// カスタムTooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded-lg shadow-sm p-3 text-sm">
      <p className="text-[#4B5563] dark:text-[#9CA3AF] text-xs mb-2">
        {formatDate(label)}
      </p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: entry.color }}
            />
            <span className="text-[#4B5563] dark:text-[#D1D5DB]">{entry.name}</span>
          </span>
          <span className="font-medium tabular-nums">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
      {payload[0]?.payload?.net_worth !== undefined && (
        <div className="flex items-center justify-between gap-4 mt-2 pt-2 border-t border-[#E5E7EB] dark:border-[#374151]">
          <span className="text-[#4B5563] dark:text-[#D1D5DB]">純資産</span>
          <span className="font-semibold tabular-nums">
            {formatCurrency(payload[0].payload.net_worth)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function AssetHistoryChart({
  data,
  loading,
}: AssetHistoryChartProps) {
  const [range, setRange] = useState<DateRange>("all");

  const filtered = useMemo(() => filterByRange(data, range), [data, range]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-[#E5E7EB] dark:border-[#374151] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="skeleton h-5 w-24 rounded" />
          <div className="flex gap-1">
            {DATE_RANGES.map((r) => (
              <div key={r.value} className="skeleton h-7 w-10 rounded" />
            ))}
          </div>
        </div>
        <div className="skeleton h-64 w-full rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-[#E5E7EB] dark:border-[#374151] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="font-semibold text-sm">資産推移</h2>
        {/* 期間タブ */}
        <div className="flex gap-0.5 flex-wrap">
          {DATE_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                range === r.value
                  ? "bg-[#0F62FE] text-white"
                  : "text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#374151]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-[#9CA3AF] text-sm">データがありません</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={filtered}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradAssets" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0F62FE" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0F62FE" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradLiabilities" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6B7280" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#6B7280" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#F3F4F6"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickFormatter={(v) =>
                new Date(v).toLocaleDateString("ja-JP", {
                  month: "short",
                  day: "numeric",
                })
              }
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickFormatter={(v) => {
                if (Math.abs(v) >= 100_000_000) return `${(v / 100_000_000).toFixed(0)}億`;
                if (Math.abs(v) >= 10_000) return `${(v / 10_000).toFixed(0)}万`;
                return `${v}`;
              }}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey="total_assets"
              name="総資産"
              stroke="#0F62FE"
              strokeWidth={1.5}
              fill="url(#gradAssets)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="total_liabilities"
              name="負債"
              stroke="#6B7280"
              strokeWidth={1.5}
              fill="url(#gradLiabilities)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

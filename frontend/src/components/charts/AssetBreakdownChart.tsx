"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Treemap,
} from "recharts";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

interface BreakdownItem {
  name: string;
  value: number;
  color?: string;
}

interface AssetBreakdownChartProps {
  assets: BreakdownItem[];
  liabilities: BreakdownItem[];
  loading?: boolean;
}

const COLORS = [
  "#0F62FE", "#2D7DD2", "#1A56DB", "#76A9FA",
  "#3B82F6", "#6366F1", "#8B5CF6", "#A78BFA",
];

const LIABILITY_COLORS = ["#6B7280", "#9CA3AF", "#4B5563"];

function TreemapCell(props: any) {
  const { x, y, width, height, name, value, index } = props;
  if (width < 30 || height < 20) return null;
  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={width - 2}
        height={height - 2}
        fill={COLORS[index % COLORS.length]}
        rx={3}
      />
      {width > 60 && height > 30 && (
        <>
          <text x={x + 6} y={y + 14} fontSize={11} fill="white" fontWeight={500}>
            {name.length > 8 ? name.slice(0, 7) + "…" : name}
          </text>
          {height > 44 && (
            <text x={x + 6} y={y + 28} fontSize={10} fill="rgba(255,255,255,0.8)">
              {formatCurrency(value, { compact: true })}
            </text>
          )}
        </>
      )}
    </g>
  );
}

function DonutChart({ data, loading }: { data: BreakdownItem[]; loading?: boolean }) {
  if (loading) {
    return <div className="skeleton w-40 h-40 rounded-full mx-auto" />;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={76}
            paddingAngle={1.5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={entry.color ?? COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), ""]}
            contentStyle={{
              fontSize: "12px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* 中央に総額 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-xs text-[#9CA3AF]">合計</p>
        <p className="text-sm font-semibold tabular-nums">
          {formatCurrency(total, { compact: true })}
        </p>
      </div>
    </div>
  );
}

export default function AssetBreakdownChart({
  assets,
  liabilities,
  loading,
}: AssetBreakdownChartProps) {
  const [view, setView] = useState<"donut" | "treemap">("donut");

  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.value, 0);

  return (
    <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-[#E5E7EB] dark:border-[#374151] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-sm">資産内訳</h2>
        <div className="flex gap-0.5">
          {(["donut", "treemap"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                view === v
                  ? "bg-[#0F62FE] text-white"
                  : "text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#374151]"
              }`}
            >
              {v === "donut" ? "ドーナツ" : "ツリー"}
            </button>
          ))}
        </div>
      </div>

      {/* 資産ドーナツ */}
      {view === "donut" ? (
        <DonutChart data={assets} loading={loading} />
      ) : (
        <div className="h-44">
          {loading ? (
            <div className="skeleton h-full w-full rounded" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={assets}
                dataKey="value"
                aspectRatio={4 / 3}
                content={<TreemapCell />}
              />
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* 凡例 */}
      {!loading && (
        <div className="mt-3 space-y-1.5">
          {assets.slice(0, 5).map((item, i) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ background: item.color ?? COLORS[i % COLORS.length] }}
                />
                <span className="text-[#4B5563] dark:text-[#D1D5DB] truncate max-w-24">
                  {item.name}
                </span>
              </span>
              <span className="tabular-nums font-medium ml-2">
                {formatCurrency(item.value, { compact: true })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 負債バー */}
      {liabilities.length > 0 && !loading && (
        <div className="mt-4 pt-4 border-t border-[#E5E7EB] dark:border-[#374151]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#6B7280]">負債合計</span>
            <span className="text-xs font-semibold tabular-nums text-[#6B7280]">
              {formatCurrency(totalLiabilities)}
            </span>
          </div>
          <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-[#F3F4F6] dark:bg-[#374151]">
            {liabilities.map((item, i) => {
              const pct = totalLiabilities > 0 ? (item.value / totalLiabilities) * 100 : 0;
              return (
                <div
                  key={item.name}
                  style={{
                    width: `${pct}%`,
                    background: item.color ?? LIABILITY_COLORS[i % LIABILITY_COLORS.length],
                  }}
                  title={`${item.name}: ${formatCurrency(item.value)}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

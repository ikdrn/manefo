import { formatCurrency } from "@/lib/utils/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// モック収支データ（12ヶ月）
const MOCK_MONTHLY = [
  { month: "3月", income: 450000, expense: 312000 },
  { month: "4月", income: 450000, expense: 298000 },
  { month: "5月", income: 450000, expense: 340000 },
  { month: "6月", income: 650000, expense: 290000 },  // ボーナス
  { month: "7月", income: 450000, expense: 380000 },
  { month: "8月", income: 450000, expense: 420000 },
  { month: "9月", income: 450000, expense: 310000 },
  { month: "10月", income: 450000, expense: 295000 },
  { month: "11月", income: 450000, expense: 330000 },
  { month: "12月", income: 650000, expense: 490000 }, // ボーナス
  { month: "1月", income: 450000, expense: 280000 },
  { month: "2月", income: 450000, expense: 265000 },
].map((d) => ({ ...d, net: d.income - d.expense }));

const MOCK_CATEGORIES = [
  { name: "食費", amount: 45_200, budget: 50_000, icon: "🍽️", color: "#DC2626" },
  { name: "住居費", amount: 120_000, budget: 120_000, icon: "🏠", color: "#6B7280" },
  { name: "交通費", amount: 8_400, budget: 15_000, icon: "🚃", color: "#6B7280" },
  { name: "光熱費", amount: 11_200, budget: 20_000, icon: "⚡", color: "#6B7280" },
  { name: "サブスク", amount: 6_200, budget: 10_000, icon: "📱", color: "#6B7280" },
  { name: "娯楽", amount: 22_800, budget: 30_000, icon: "🎮", color: "#6B7280" },
  { name: "交際費", amount: 15_600, budget: undefined, icon: "👥", color: "#6B7280" },
];

export default function ReportsPage() {
  const totalIncome = MOCK_MONTHLY[MOCK_MONTHLY.length - 1].income;
  const totalExpense = MOCK_MONTHLY[MOCK_MONTHLY.length - 1].expense;
  const totalNet = totalIncome - totalExpense;

  const yearlyIncome = MOCK_MONTHLY.reduce((s, m) => s + m.income, 0);
  const yearlyExpense = MOCK_MONTHLY.reduce((s, m) => s + m.expense, 0);

  return (
    <div className="space-y-6 pb-8">
      <h1 className="text-xl font-semibold">収支レポート</h1>

      {/* 今月サマリー */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-[#E5E7EB] dark:border-[#374151] p-4">
          <p className="text-xs text-[#9CA3AF] mb-1">今月の収入</p>
          <p className="text-lg font-semibold tabular-nums text-[#16A34A]">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-[#E5E7EB] dark:border-[#374151] p-4">
          <p className="text-xs text-[#9CA3AF] mb-1">今月の支出</p>
          <p className="text-lg font-semibold tabular-nums text-[#DC2626]">
            {formatCurrency(totalExpense)}
          </p>
        </div>
        <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-[#E5E7EB] dark:border-[#374151] p-4">
          <p className="text-xs text-[#9CA3AF] mb-1">今月の収支</p>
          <p className={`text-lg font-semibold tabular-nums ${totalNet >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
            {formatCurrency(totalNet, { showSign: true })}
          </p>
        </div>
      </div>

      {/* 月次収支グラフ（完全無料・全期間） */}
      <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-[#E5E7EB] dark:border-[#374151] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">月次収支（12ヶ月）</h2>
          <span className="text-xs text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full font-medium">
            無料・全期間
          </span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={MOCK_MONTHLY} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
              width={40}
            />
            <Tooltip
              formatter={(v: number, name: string) => [formatCurrency(v), name]}
              contentStyle={{
                fontSize: "12px",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} iconType="square" iconSize={8} />
            <Bar dataKey="income" name="収入" fill="#16A34A" radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Bar dataKey="expense" name="支出" fill="#DC2626" radius={[3, 3, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 年間サマリー */}
      <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-[#E5E7EB] dark:border-[#374151] p-5">
        <h2 className="font-semibold text-sm mb-4">年間収支</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[#9CA3AF]">年間収入</p>
            <p className="text-xl font-semibold tabular-nums text-[#16A34A] mt-0.5">
              {formatCurrency(yearlyIncome)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#9CA3AF]">年間支出</p>
            <p className="text-xl font-semibold tabular-nums text-[#DC2626] mt-0.5">
              {formatCurrency(yearlyExpense)}
            </p>
          </div>
          <div className="col-span-2 pt-3 border-t border-[#E5E7EB] dark:border-[#374151]">
            <p className="text-xs text-[#9CA3AF]">年間収支（貯蓄額）</p>
            <p className={`text-2xl font-bold tabular-nums mt-0.5 ${yearlyIncome - yearlyExpense >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
              {formatCurrency(yearlyIncome - yearlyExpense, { showSign: true })}
            </p>
          </div>
        </div>
      </div>

      {/* カテゴリ別支出 */}
      <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-[#E5E7EB] dark:border-[#374151] p-5">
        <h2 className="font-semibold text-sm mb-4">カテゴリ別支出（今月）</h2>
        <div className="space-y-3">
          {MOCK_CATEGORIES.map((cat) => {
            const pct = cat.budget ? (cat.amount / cat.budget) * 100 : null;
            const isOverBudget = pct !== null && pct > 90;
            return (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-2 text-sm">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </span>
                  <div className="text-right">
                    <span className={`text-sm font-medium tabular-nums ${isOverBudget ? "text-[#D97706]" : ""}`}>
                      {formatCurrency(cat.amount)}
                    </span>
                    {cat.budget && (
                      <span className="text-xs text-[#9CA3AF] ml-1">
                        / {formatCurrency(cat.budget)}
                      </span>
                    )}
                  </div>
                </div>
                {pct !== null && (
                  <div className="h-1.5 bg-[#F3F4F6] dark:bg-[#374151] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct > 100
                          ? "bg-[#DC2626]"
                          : pct > 80
                          ? "bg-[#D97706]"
                          : "bg-[#0F62FE]"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

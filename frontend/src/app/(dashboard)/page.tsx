import { createClient } from "@/lib/supabase/server";
import AssetHistoryChart from "@/components/charts/AssetHistoryChart";
import AssetBreakdownChart from "@/components/charts/AssetBreakdownChart";
import AccountCard from "@/components/accounts/AccountCard";
import { formatCurrency, formatPercent, getChangeColor } from "@/lib/utils/format";
import type { Account, AssetDataPoint, AssetSummary } from "@/types";
import { RefreshCw, PlusCircle, ReceiptText, BarChart3, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

// モックデータ生成（実際はSupabaseから取得）
function generateMockChartData(): AssetDataPoint[] {
  const data: AssetDataPoint[] = [];
  const now = new Date();
  let base = 14_500_000;

  for (let i = 365; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const fluctuation = (Math.random() - 0.48) * 150_000;
    base = Math.max(base + fluctuation, 10_000_000);

    data.push({
      date: date.toISOString().split("T")[0],
      total_assets: base,
      total_liabilities: 138_200,
      net_worth: base - 138_200,
      breakdown: {},
    });
  }
  return data;
}

async function getAccountsFromDB(): Promise<Account[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_account_summary")
    .select("*")
    .order("display_order");

  if (error || !data?.length) {
    // ダミーデータ（DBにデータがない場合）
    return MOCK_ACCOUNTS;
  }
  return data as Account[];
}

// ダミー口座データ
const MOCK_ACCOUNTS: Account[] = [
  {
    id: "1", user_id: "u1", name: "みずほ銀行", account_type: "checking",
    asset_class: "asset", currency: "JPY", balance: 4_920_000,
    balance_updated_at: new Date(Date.now() - 7200000).toISOString(),
    is_manual: false, is_hidden: false, display_order: 10,
    provider_status: "active", institution_name: "みずほ銀行",
    created_at: "", updated_at: "",
  },
  {
    id: "2", user_id: "u1", name: "SBI証券", account_type: "investment",
    asset_class: "asset", currency: "JPY", balance: 8_450_300,
    balance_updated_at: new Date(Date.now() - 10800000).toISOString(),
    is_manual: false, is_hidden: false, display_order: 20,
    provider_status: "active", institution_name: "SBI証券",
    created_at: "", updated_at: "",
  },
  {
    id: "3", user_id: "u1", name: "楽天証券", account_type: "investment",
    asset_class: "asset", currency: "JPY", balance: 512_040,
    balance_updated_at: new Date(Date.now() - 86400000).toISOString(),
    is_manual: false, is_hidden: false, display_order: 30,
    provider_status: "needs_login", institution_name: "楽天証券",
    created_at: "", updated_at: "",
  },
  {
    id: "4", user_id: "u1", name: "住信SBIネット銀行", account_type: "checking",
    asset_class: "asset", currency: "JPY", balance: 1_850_000,
    balance_updated_at: new Date(Date.now() - 3600000).toISOString(),
    is_manual: false, is_hidden: false, display_order: 40,
    provider_status: "active", institution_name: "住信SBIネット銀行",
    created_at: "", updated_at: "",
  },
  {
    id: "5", user_id: "u1", name: "楽天カード", account_type: "credit_card",
    asset_class: "liability", currency: "JPY", balance: -138_200,
    balance_updated_at: new Date(Date.now() - 21600000).toISOString(),
    is_manual: false, is_hidden: false, display_order: 50,
    provider_status: "active", institution_name: "楽天カード",
    created_at: "", updated_at: "",
  },
];

export default async function HomePage() {
  const accounts = await getAccountsFromDB();
  const chartData = generateMockChartData();

  const assets = accounts.filter((a) => a.asset_class === "asset");
  const liabilities = accounts.filter((a) => a.asset_class === "liability");

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + Math.abs(a.balance), 0);
  const netWorth = totalAssets - totalLiabilities;

  // 前日比（ダミー）
  const dailyChange = 18_400;
  const dailyChangePct = dailyChange / (netWorth - dailyChange);
  const monthlyChange = 328_000;
  const monthlyChangePct = monthlyChange / (netWorth - monthlyChange);

  // 内訳データ（チャート用）
  const assetBreakdown = [
    { name: "証券・投資", value: 8_962_340, color: "#0F62FE" },
    { name: "普通預金",   value: 6_770_000, color: "#2D7DD2" },
    { name: "定期預金",   value: 0,          color: "#76A9FA" },
    { name: "暗号資産",   value: 0,          color: "#6366F1" },
  ].filter((d) => d.value > 0);

  const liabilityBreakdown = [
    { name: "クレジット", value: 138_200, color: "#6B7280" },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* ============================================================
          総資産サマリー（3秒ルール: 一番目立つ位置に最大文字で）
          ============================================================ */}
      <section>
        <p className="text-xs text-[#9CA3AF] mb-0.5">純資産（総資産 − 負債）</p>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
          <h1 className="text-4xl font-bold tabular-nums tracking-tight">
            {formatCurrency(netWorth)}
          </h1>
          <div className="flex gap-4 pb-1 flex-wrap">
            {/* 前月比 */}
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-[#9CA3AF] text-xs">前月比</span>
              <span className={`font-semibold tabular-nums ${getChangeColor(monthlyChange)}`}>
                {formatCurrency(monthlyChange, { showSign: true, compact: true })}
              </span>
              <span className={`text-xs tabular-nums ${getChangeColor(monthlyChange)}`}>
                ({formatPercent(monthlyChangePct, { showSign: true })})
              </span>
            </div>
            {/* 前日比 */}
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-[#9CA3AF] text-xs">前日比</span>
              <span className={`font-semibold tabular-nums ${getChangeColor(dailyChange)}`}>
                {formatCurrency(dailyChange, { showSign: true, compact: true })}
              </span>
              <span className={`text-xs tabular-nums ${getChangeColor(dailyChange)}`}>
                ({formatPercent(dailyChangePct, { showSign: true })})
              </span>
            </div>
          </div>
        </div>
        {/* サブ表示: 資産・負債内訳 */}
        <div className="flex gap-4 mt-2">
          <span className="text-xs text-[#4B5563]">
            総資産{" "}
            <span className="font-medium tabular-nums text-[#111827] dark:text-[#F9FAFB]">
              {formatCurrency(totalAssets, { compact: true })}
            </span>
          </span>
          <span className="text-xs text-[#9CA3AF]">/</span>
          <span className="text-xs text-[#4B5563]">
            負債{" "}
            <span className="font-medium tabular-nums text-[#6B7280]">
              {formatCurrency(totalLiabilities, { compact: true })}
            </span>
          </span>
        </div>
      </section>

      {/* ============================================================
          グラフ 2カラム（デスクトップ）
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 資産推移グラフ（左・大きく） */}
        <div className="lg:col-span-2">
          <AssetHistoryChart data={chartData} />
        </div>

        {/* 資産内訳（右・コンパクト） */}
        <div className="lg:col-span-1">
          <AssetBreakdownChart
            assets={assetBreakdown}
            liabilities={liabilityBreakdown}
          />
        </div>
      </div>

      {/* ============================================================
          口座一覧
          ============================================================ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">口座一覧</h2>
          <Link
            href="/accounts"
            className="text-xs text-[#0F62FE] hover:underline"
          >
            すべて見る
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      </section>

      {/* ============================================================
          クイックアクション
          ============================================================ */}
      <section>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/transactions/add"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#374151] text-sm hover:bg-[#F9FAFB] dark:hover:bg-[#374151] transition-colors"
          >
            <PlusCircle size={14} className="text-[#0F62FE]" />
            明細追加
          </Link>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#374151] text-sm hover:bg-[#F9FAFB] dark:hover:bg-[#374151] transition-colors">
            <RefreshCw size={14} className="text-[#0F62FE]" />
            全口座更新
          </button>
          <Link
            href="/transactions?tab=categories"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#374151] text-sm hover:bg-[#F9FAFB] dark:hover:bg-[#374151] transition-colors"
          >
            <SlidersHorizontal size={14} className="text-[#0F62FE]" />
            カテゴリ修正
          </Link>
          <Link
            href="/reports"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#374151] text-sm hover:bg-[#F9FAFB] dark:hover:bg-[#374151] transition-colors"
          >
            <BarChart3 size={14} className="text-[#0F62FE]" />
            レポート
          </Link>
        </div>
      </section>
    </div>
  );
}

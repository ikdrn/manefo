import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, getChangeColor } from "@/lib/utils/format";
import { PlusCircle, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import type { Transaction } from "@/types";

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "1", user_id: "u1", account_id: "1", transaction_type: "income",
    amount: 450000, currency: "JPY", description: "給与振込",
    is_income: true, is_transfer: false, transacted_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    is_manual: false, category_name: "給与・賞与", category_icon: "briefcase", category_color: "#16A34A",
    account_name: "みずほ銀行", created_at: "", updated_at: "",
  },
  {
    id: "2", user_id: "u1", account_id: "5", transaction_type: "expense",
    amount: -120000, currency: "JPY", description: "家賃 引落",
    is_income: false, is_transfer: false, transacted_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    is_manual: false, category_name: "住居費", category_icon: "home", category_color: "#6B7280",
    account_name: "楽天カード", created_at: "", updated_at: "",
  },
  {
    id: "3", user_id: "u1", account_id: "5", transaction_type: "expense",
    amount: -6800, currency: "JPY", description: "成城石井",
    is_income: false, is_transfer: false, transacted_at: new Date(Date.now() - 86400000).toISOString(),
    is_manual: false, category_name: "食費", category_icon: "utensils", category_color: "#DC2626",
    account_name: "楽天カード", created_at: "", updated_at: "",
  },
  {
    id: "4", user_id: "u1", account_id: "5", transaction_type: "expense",
    amount: -1490, currency: "JPY", description: "Netflix",
    is_income: false, is_transfer: false, transacted_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    is_manual: false, category_name: "サブスク・月額", category_icon: "repeat", category_color: "#6B7280",
    account_name: "楽天カード", created_at: "", updated_at: "",
  },
  {
    id: "5", user_id: "u1", account_id: "5", transaction_type: "expense",
    amount: -980, currency: "JPY", description: "Spotify プレミアム",
    is_income: false, is_transfer: false, transacted_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    is_manual: false, category_name: "サブスク・月額", category_icon: "repeat", category_color: "#6B7280",
    account_name: "楽天カード", created_at: "", updated_at: "",
  },
  {
    id: "6", user_id: "u1", account_id: "5", transaction_type: "expense",
    amount: -3000, currency: "JPY", description: "ChatGPT Plus",
    is_income: false, is_transfer: false, transacted_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    is_manual: false, category_name: "サブスク・月額", category_icon: "repeat", category_color: "#6B7280",
    account_name: "楽天カード", created_at: "", updated_at: "",
  },
  {
    id: "7", user_id: "u1", account_id: "5", transaction_type: "expense",
    amount: -4200, currency: "JPY", description: "東京メトロ",
    is_income: false, is_transfer: false, transacted_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    is_manual: false, category_name: "交通費", category_icon: "car", category_color: "#6B7280",
    account_name: "楽天カード", created_at: "", updated_at: "",
  },
];

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: dbTransactions } = await supabase
    .from("transactions")
    .select(`*, categories(name, icon, color), accounts(name)`)
    .order("transacted_at", { ascending: false })
    .limit(50);

  const transactions: Transaction[] = dbTransactions?.length
    ? (dbTransactions as Transaction[])
    : MOCK_TRANSACTIONS;

  // 日付でグループ化
  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
    const date = t.transacted_at.slice(0, 10);
    if (!acc[date]) acc[date] = [];
    acc[date].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-5 pb-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">取引明細</h1>
        <Link
          href="/transactions/add"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0F62FE] text-white text-sm hover:bg-[#0353E9] transition-colors"
        >
          <PlusCircle size={14} />
          手動追加
        </Link>
      </div>

      {/* 検索・フィルター */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="search"
            placeholder="取引を検索..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm focus:outline-none focus:ring-2 focus:ring-[#0F62FE]"
          />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#374151] text-sm hover:bg-[#F9FAFB] dark:hover:bg-[#374151] transition-colors">
          <SlidersHorizontal size={14} />
          フィルター
        </button>
      </div>

      {/* 取引リスト（日付グループ） */}
      {Object.entries(grouped).map(([date, txns]) => (
        <section key={date}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF]">
              {formatDate(date)}
            </p>
            <p className={`text-xs font-medium tabular-nums ${
              txns.reduce((s, t) => s + t.amount, 0) >= 0
                ? "text-[#16A34A]"
                : "text-[#DC2626]"
            }`}>
              {formatCurrency(txns.reduce((s, t) => s + t.amount, 0), { showSign: true, compact: true })}
            </p>
          </div>

          <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-[#E5E7EB] dark:border-[#374151] divide-y divide-[#F3F4F6] dark:divide-[#374151]">
            {txns.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#F9FAFB] dark:hover:bg-[#374151] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                    style={{ background: `${t.category_color ?? "#6B7280"}20` }}
                  >
                    {/* カテゴリアイコン（Lucideが使えないのでemoji代替） */}
                    <span>
                      {t.category_name?.includes("食費") ? "🍽️"
                        : t.category_name?.includes("住居") ? "🏠"
                        : t.category_name?.includes("交通") ? "🚃"
                        : t.category_name?.includes("サブスク") ? "📱"
                        : t.category_name?.includes("給与") ? "💰"
                        : "💳"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" title={t.description}>
                      {t.description}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">
                      {t.category_name ?? "未分類"} · {t.account_name}
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-semibold tabular-nums flex-shrink-0 ml-3 ${
                  t.amount > 0 ? "text-[#16A34A]" : "text-[#111827] dark:text-[#F9FAFB]"
                }`}>
                  {formatCurrency(t.amount, { showSign: t.amount > 0 })}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

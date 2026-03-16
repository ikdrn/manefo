import { createClient } from "@/lib/supabase/server";
import AccountCard from "@/components/accounts/AccountCard";
import { formatCurrency } from "@/lib/utils/format";
import { PlusCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { Account } from "@/types";

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

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: dbAccounts } = await supabase
    .from("v_account_summary")
    .select("*")
    .order("display_order");

  const accounts: Account[] = dbAccounts?.length ? (dbAccounts as Account[]) : MOCK_ACCOUNTS;

  const assetAccounts = accounts.filter((a) => a.asset_class === "asset");
  const liabilityAccounts = accounts.filter((a) => a.asset_class === "liability");

  const totalAssets = assetAccounts.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilityAccounts.reduce((s, a) => s + Math.abs(a.balance), 0);

  return (
    <div className="space-y-6 pb-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">口座一覧</h1>
          <p className="text-sm text-[#4B5563] mt-0.5">
            {accounts.length}件の口座
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#374151] text-sm hover:bg-[#F9FAFB] dark:hover:bg-[#374151] transition-colors">
            <RefreshCw size={14} />
            全口座更新
          </button>
          <Link
            href="/accounts/add"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0F62FE] text-white text-sm hover:bg-[#0353E9] transition-colors"
          >
            <PlusCircle size={14} />
            口座を追加
          </Link>
        </div>
      </div>

      {/* 資産サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-[#E5E7EB] dark:border-[#374151] p-4">
          <p className="text-xs text-[#9CA3AF] mb-1">総資産</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatCurrency(totalAssets, { compact: true })}
          </p>
        </div>
        <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-[#E5E7EB] dark:border-[#374151] p-4">
          <p className="text-xs text-[#9CA3AF] mb-1">負債合計</p>
          <p className="text-lg font-semibold tabular-nums text-[#6B7280]">
            {formatCurrency(totalLiabilities, { compact: true })}
          </p>
        </div>
        <div className="bg-white dark:bg-[#1F2937] rounded-xl border border-[#E5E7EB] dark:border-[#374151] p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-[#9CA3AF] mb-1">純資産</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatCurrency(totalAssets - totalLiabilities, { compact: true })}
          </p>
        </div>
      </div>

      {/* 資産口座 */}
      {assetAccounts.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-[#4B5563] mb-3">資産</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {assetAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </section>
      )}

      {/* 負債口座 */}
      {liabilityAccounts.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-[#4B5563] mb-3">負債</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {liabilityAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import type { Account } from "@/types";
import { formatCurrency, formatDate, getChangeColor } from "@/lib/utils/format";
import {
  Building2,
  TrendingUp,
  CreditCard,
  Wallet,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

interface AccountCardProps {
  account: Account;
  previousBalance?: number;
  onSync?: (accountId: string) => void;
}

const ACCOUNT_ICONS: Record<string, LucideIcon> = {
  checking: Building2,
  savings: Building2,
  credit_card: CreditCard,
  investment: TrendingUp,
  loan: CreditCard,
  point: Wallet,
  crypto: Wallet,
  pension: TrendingUp,
  other: Wallet,
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "普通預金",
  savings: "定期預金",
  credit_card: "クレジットカード",
  investment: "証券口座",
  loan: "ローン",
  point: "ポイント",
  crypto: "暗号資産",
  pension: "年金・NISA",
  other: "その他",
};

export default function AccountCard({
  account,
  previousBalance,
  onSync,
}: AccountCardProps) {
  const Icon = ACCOUNT_ICONS[account.account_type] ?? Wallet;
  const isLiability = account.asset_class === "liability";
  const change =
    previousBalance !== undefined ? account.balance - previousBalance : undefined;
  const changePct =
    previousBalance && previousBalance !== 0
      ? change! / Math.abs(previousBalance)
      : undefined;

  const statusDot =
    account.provider_status === "active"
      ? "bg-[#16A34A]"
      : account.provider_status === "needs_login"
      ? "bg-[#D97706]"
      : account.provider_status === "error"
      ? "bg-[#DC2626]"
      : "bg-[#9CA3AF]";

  return (
    <Link
      href={`/accounts/${account.id}`}
      className="block bg-white dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded-xl p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        {/* 左: アイコン + 口座名 */}
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: account.icon_color
                ? `${account.icon_color}20`
                : isLiability
                ? "#F3F4F6"
                : "#D0E2FF",
            }}
          >
            <Icon
              size={18}
              className={
                isLiability ? "text-[#6B7280]" : "text-[#0F62FE]"
              }
              style={
                account.icon_color
                  ? { color: account.icon_color }
                  : undefined
              }
            />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate" title={account.name}>
              {account.name}
            </p>
            <p className="text-xs text-[#9CA3AF]">
              {account.institution_name
                ? account.institution_name
                : ACCOUNT_TYPE_LABELS[account.account_type]}
            </p>
          </div>
        </div>

        {/* 右: 残高 + 変動 */}
        <div className="text-right flex-shrink-0">
          <p
            className={`font-semibold tabular-nums ${
              isLiability ? "text-[#6B7280]" : ""
            }`}
          >
            {formatCurrency(account.balance)}
          </p>
          {change !== undefined && (
            <p
              className={`text-xs tabular-nums ${getChangeColor(
                isLiability ? -change : change
              )}`}
            >
              {formatCurrency(change, { showSign: true, compact: true })}
              {changePct !== undefined && (
                <span className="ml-1 opacity-70">
                  ({(changePct * 100).toFixed(1)}%)
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* フッター */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F3F4F6] dark:border-[#374151]">
        <div className="flex items-center gap-2">
          {!account.is_manual && (
            <>
              <span
                className={`w-1.5 h-1.5 rounded-full ${statusDot}`}
              />
              {account.provider_status === "needs_login" && (
                <span className="flex items-center gap-1 text-[10px] text-[#D97706]">
                  <AlertCircle size={11} />
                  再ログイン必要
                </span>
              )}
              {account.provider_status === "error" && (
                <span className="flex items-center gap-1 text-[10px] text-[#DC2626]">
                  <AlertCircle size={11} />
                  エラー
                </span>
              )}
            </>
          )}
          <span className="text-[10px] text-[#9CA3AF]">
            {account.balance_updated_at
              ? formatDate(account.balance_updated_at, "relative")
              : "未取得"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onSync && !account.is_manual && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onSync(account.id);
              }}
              className="p-1 rounded hover:bg-[#F3F4F6] dark:hover:bg-[#374151] transition-colors"
              title="同期"
            >
              <RefreshCw size={13} className="text-[#9CA3AF]" />
            </button>
          )}
          <ChevronRight size={14} className="text-[#9CA3AF]" />
        </div>
      </div>
    </Link>
  );
}

import { NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/assets/summary
export const GET = withAuth(async (_req, user) => {
  const db = createAdminClient();

  // 現在の純資産
  const { data: accounts, error } = await db
    .from("accounts")
    .select("asset_class, balance")
    .eq("user_id", user.id)
    .eq("is_hidden", false);

  if (error) return apiError(error.message);

  const totalAssets = accounts
    .filter((a) => a.asset_class === "asset")
    .reduce((s, a) => s + Number(a.balance), 0);

  const totalLiabilities = accounts
    .filter((a) => a.asset_class === "liability")
    .reduce((s, a) => s + Math.abs(Number(a.balance)), 0);

  const netWorth = totalAssets - totalLiabilities;

  // 前日スナップショット
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const { data: snapsYesterday } = await db
    .from("asset_snapshots")
    .select("balance_jpy, accounts!inner(asset_class)")
    .eq("user_id", user.id)
    .eq("snapshot_date", yesterdayStr);

  let dailyChange: number | null = null;
  let dailyChangePct: number | null = null;
  if (snapsYesterday?.length) {
    const yAssets = snapsYesterday
      .filter((s: any) => s.accounts.asset_class === "asset")
      .reduce((sum: number, s: any) => sum + Number(s.balance_jpy), 0);
    const yLiabilities = snapsYesterday
      .filter((s: any) => s.accounts.asset_class === "liability")
      .reduce((sum: number, s: any) => sum + Math.abs(Number(s.balance_jpy)), 0);
    const yNet = yAssets - yLiabilities;
    dailyChange = netWorth - yNet;
    dailyChangePct = yNet !== 0 ? dailyChange / yNet : null;
  }

  // 前月末スナップショット
  const lastMonthEnd = new Date();
  lastMonthEnd.setDate(0); // 今月1日 - 1 = 前月末
  const lastMonthStr = lastMonthEnd.toISOString().slice(0, 10);

  const { data: snapsLastMonth } = await db
    .from("asset_snapshots")
    .select("balance_jpy, accounts!inner(asset_class)")
    .eq("user_id", user.id)
    .eq("snapshot_date", lastMonthStr);

  let monthlyChange: number | null = null;
  let monthlyChangePct: number | null = null;
  if (snapsLastMonth?.length) {
    const mAssets = snapsLastMonth
      .filter((s: any) => s.accounts.asset_class === "asset")
      .reduce((sum: number, s: any) => sum + Number(s.balance_jpy), 0);
    const mLiabilities = snapsLastMonth
      .filter((s: any) => s.accounts.asset_class === "liability")
      .reduce((sum: number, s: any) => sum + Math.abs(Number(s.balance_jpy)), 0);
    const mNet = mAssets - mLiabilities;
    monthlyChange = netWorth - mNet;
    monthlyChangePct = mNet !== 0 ? monthlyChange / mNet : null;
  }

  return NextResponse.json({
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    net_worth: netWorth,
    daily_change: dailyChange,
    daily_change_pct: dailyChangePct,
    monthly_change: monthlyChange,
    monthly_change_pct: monthlyChangePct,
    as_of: new Date().toISOString(),
  });
});

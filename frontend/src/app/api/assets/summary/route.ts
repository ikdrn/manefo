import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorized, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  const db = createAdminClient();

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

  // 前日
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { data: snapsYd } = await db
    .from("asset_snapshots")
    .select("balance_jpy, accounts!inner(asset_class)")
    .eq("user_id", user.id)
    .eq("snapshot_date", yesterday.toISOString().slice(0, 10));

  let dailyChange: number | null = null;
  let dailyChangePct: number | null = null;
  if (snapsYd?.length) {
    const yNet =
      (snapsYd as any[])
        .filter((s) => s.accounts.asset_class === "asset")
        .reduce((sum, s) => sum + Number(s.balance_jpy), 0) -
      (snapsYd as any[])
        .filter((s) => s.accounts.asset_class === "liability")
        .reduce((sum, s) => sum + Math.abs(Number(s.balance_jpy)), 0);
    dailyChange = netWorth - yNet;
    dailyChangePct = yNet !== 0 ? dailyChange / yNet : null;
  }

  // 前月末
  const lastMonthEnd = new Date();
  lastMonthEnd.setDate(0);
  const { data: snapsLm } = await db
    .from("asset_snapshots")
    .select("balance_jpy, accounts!inner(asset_class)")
    .eq("user_id", user.id)
    .eq("snapshot_date", lastMonthEnd.toISOString().slice(0, 10));

  let monthlyChange: number | null = null;
  let monthlyChangePct: number | null = null;
  if (snapsLm?.length) {
    const mNet =
      (snapsLm as any[])
        .filter((s) => s.accounts.asset_class === "asset")
        .reduce((sum, s) => sum + Number(s.balance_jpy), 0) -
      (snapsLm as any[])
        .filter((s) => s.accounts.asset_class === "liability")
        .reduce((sum, s) => sum + Math.abs(Number(s.balance_jpy)), 0);
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
}

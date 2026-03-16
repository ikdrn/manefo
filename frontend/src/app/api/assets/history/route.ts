import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/assets/history?range=all
// 全期間・無制限（これが最大の差別化ポイント）
export const GET = withAuth(async (req: NextRequest, user) => {
  const range = new URL(req.url).searchParams.get("range") ?? "all";

  const daysMap: Record<string, number> = {
    "1w": 7, "1m": 30, "3m": 90, "6m": 180,
    "1y": 365, "3y": 1095, "5y": 1825,
  };

  const db = createAdminClient();

  let query = db
    .from("asset_snapshots")
    .select("snapshot_date, balance_jpy, accounts!inner(asset_class)")
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: true });

  if (range !== "all" && daysMap[range]) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysMap[range]);
    query = query.gte("snapshot_date", cutoff.toISOString().slice(0, 10));
  }

  const { data, error } = await query;
  if (error) return apiError(error.message);

  // 日付ごとに集計
  const byDate = new Map<string, { assets: number; liabilities: number }>();

  for (const row of data as any[]) {
    const date: string = row.snapshot_date;
    const bal = Number(row.balance_jpy);
    const assetClass: string = row.accounts.asset_class;

    const entry = byDate.get(date) ?? { assets: 0, liabilities: 0 };
    if (assetClass === "asset") entry.assets += bal;
    else entry.liabilities += Math.abs(bal);
    byDate.set(date, entry);
  }

  const history = Array.from(byDate.entries()).map(([date, v]) => ({
    date,
    total_assets: v.assets,
    total_liabilities: v.liabilities,
    net_worth: v.assets - v.liabilities,
  }));

  return NextResponse.json(history);
});

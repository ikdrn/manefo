import { NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/reports/monthly
// 月次収支（全期間・無制限 — 差別化ポイント）
export const GET = withAuth(async (_req, user) => {
  const db = createAdminClient();

  const { data, error } = await db
    .from("transactions")
    .select("transaction_type, amount, transacted_at")
    .eq("user_id", user.id)
    .eq("is_transfer", false)
    .order("transacted_at", { ascending: true });

  if (error) return apiError(error.message);

  // 月ごとに集計
  const monthly = new Map<string, { income: number; expense: number; count: number }>();

  for (const t of data) {
    const month = t.transacted_at.slice(0, 7); // YYYY-MM
    const entry = monthly.get(month) ?? { income: 0, expense: 0, count: 0 };
    const amt = Math.abs(Number(t.amount));
    if (t.transaction_type === "income") entry.income += amt;
    else entry.expense += amt;
    entry.count += 1;
    monthly.set(month, entry);
  }

  const result = Array.from(monthly.entries()).map(([month, v]) => ({
    month,
    total_income: v.income,
    total_expense: v.expense,
    net: v.income - v.expense,
    transaction_count: v.count,
  }));

  return NextResponse.json({ data: result });
});

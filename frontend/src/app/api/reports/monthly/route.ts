import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorized, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  const db = createAdminClient();
  const { data, error } = await db
    .from("transactions")
    .select("transaction_type, amount, transacted_at")
    .eq("user_id", user.id)
    .eq("is_transfer", false)
    .order("transacted_at", { ascending: true });

  if (error) return apiError(error.message);

  const monthly = new Map<string, { income: number; expense: number; count: number }>();

  for (const t of data) {
    const month = (t.transacted_at as string).slice(0, 7);
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
}

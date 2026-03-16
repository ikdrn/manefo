import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/reports/yearly?year=2025
export const GET = withAuth(async (req: NextRequest, user) => {
  const year = Number(new URL(req.url).searchParams.get("year") ?? new Date().getFullYear());

  const db = createAdminClient();
  const { data, error } = await db
    .from("transactions")
    .select("transaction_type, amount")
    .eq("user_id", user.id)
    .eq("is_transfer", false)
    .gte("transacted_at", `${year}-01-01`)
    .lt("transacted_at", `${year + 1}-01-01`);

  if (error) return apiError(error.message);

  const totalIncome = data
    .filter((t) => t.transaction_type === "income")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const totalExpense = data
    .filter((t) => t.transaction_type === "expense")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  return NextResponse.json({
    year,
    total_income: totalIncome,
    total_expense: totalExpense,
    net: totalIncome - totalExpense,
    transaction_count: data.length,
  });
});

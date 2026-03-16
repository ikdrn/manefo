import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorized, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = Number(searchParams.get("year") ?? now.getFullYear());
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = new Date(year, month, 1).toISOString().slice(0, 10);

  const db = createAdminClient();
  const { data, error } = await db
    .from("transactions")
    .select(`transaction_type, amount, categories (id, name, icon, color)`)
    .eq("user_id", user.id)
    .eq("is_transfer", false)
    .gte("transacted_at", monthStart)
    .lt("transacted_at", nextMonth);

  if (error) return apiError(error.message);

  const grouped = new Map<string, {
    category_id: string | null;
    category_name: string;
    category_icon: string | null;
    category_color: string | null;
    transaction_type: string;
    total: number;
    count: number;
  }>();

  for (const t of data as any[]) {
    const cat = t.categories;
    const key = `${cat?.id ?? "null"}-${t.transaction_type}`;
    const entry = grouped.get(key) ?? {
      category_id: cat?.id ?? null,
      category_name: cat?.name ?? "未分類",
      category_icon: cat?.icon ?? null,
      category_color: cat?.color ?? null,
      transaction_type: t.transaction_type,
      total: 0,
      count: 0,
    };
    entry.total += Math.abs(Number(t.amount));
    entry.count += 1;
    grouped.set(key, entry);
  }

  const rows = Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  const totalExpense = rows
    .filter((r) => r.transaction_type === "expense")
    .reduce((s, r) => s + r.total, 0);

  const result = rows.map((r) => ({
    category_id: r.category_id,
    category_name: r.category_name,
    category_icon: r.category_icon,
    category_color: r.category_color,
    transaction_type: r.transaction_type,
    total_amount: r.total,
    transaction_count: r.count,
    percentage:
      r.transaction_type === "expense" && totalExpense > 0
        ? (r.total / totalExpense) * 100
        : null,
  }));

  return NextResponse.json({ year, month, total_expense: totalExpense, data: result });
}

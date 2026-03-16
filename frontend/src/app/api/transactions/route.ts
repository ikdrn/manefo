import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/transactions
export const GET = withAuth(async (req, user) => {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const perPage = Math.min(200, Number(searchParams.get("per_page") ?? 50));
  const accountId = searchParams.get("account_id");
  const categoryId = searchParams.get("category_id");
  const txType = searchParams.get("transaction_type");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const search = searchParams.get("search");

  const db = createAdminClient();
  let query = db
    .from("transactions")
    .select(`
      *,
      categories (name, icon, color),
      accounts (name)
    `, { count: "exact" })
    .eq("user_id", user.id)
    .order("transacted_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (accountId) query = query.eq("account_id", accountId);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (txType) query = query.eq("transaction_type", txType);
  if (dateFrom) query = query.gte("transacted_at", dateFrom);
  if (dateTo) query = query.lte("transacted_at", dateTo + "T23:59:59Z");
  if (search) query = query.ilike("description", `%${search}%`);

  const { data, error, count } = await query;
  if (error) return apiError(error.message);

  return NextResponse.json({
    data,
    total: count ?? 0,
    page,
    per_page: perPage,
    total_pages: Math.ceil((count ?? 0) / perPage),
  });
});

// POST /api/transactions
export const POST = withAuth(async (req, user) => {
  const body = await req.json();
  const db = createAdminClient();

  // 口座の所有確認
  const { data: acc } = await db
    .from("accounts")
    .select("id")
    .eq("id", body.account_id)
    .eq("user_id", user.id)
    .single();

  if (!acc) return apiError("Account not found", 404);

  const { data, error } = await db
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: body.account_id,
      transaction_type: body.transaction_type,
      amount: body.amount,
      currency: body.currency ?? "JPY",
      description: body.description,
      memo: body.memo ?? null,
      category_id: body.category_id ?? null,
      transacted_at: body.transacted_at,
      is_manual: true,
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return NextResponse.json(data, { status: 201 });
});

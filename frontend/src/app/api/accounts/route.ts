import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorized, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  const db = createAdminClient();
  const { data, error } = await db
    .from("accounts")
    .select(`*, financial_institutions (name, logo_url, category)`)
    .eq("user_id", user.id)
    .eq("is_hidden", false)
    .order("display_order", { ascending: true });

  if (error) return apiError(error.message);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const db = createAdminClient();

  const { data, error } = await db
    .from("accounts")
    .insert({
      user_id: user.id,
      institution_id: body.institution_id ?? null,
      name: body.name,
      account_type: body.account_type,
      asset_class: body.asset_class,
      currency: body.currency ?? "JPY",
      balance: body.balance ?? 0,
      is_manual: body.is_manual ?? true,
      display_order: body.display_order ?? 100,
      icon_color: body.icon_color ?? null,
      memo: body.memo ?? null,
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return NextResponse.json(data, { status: 201 });
}

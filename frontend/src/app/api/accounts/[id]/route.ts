import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/accounts/:id
export const GET = withAuth(async (_req, user, params) => {
  const db = createAdminClient();
  const { data, error } = await db
    .from("accounts")
    .select(`*, financial_institutions (name, logo_url, category)`)
    .eq("id", params!.id)
    .eq("user_id", user.id)
    .single();

  if (error) return apiError("Account not found", 404);
  return NextResponse.json(data);
});

// PATCH /api/accounts/:id
export const PATCH = withAuth(async (req, user, params) => {
  const body = await req.json();
  const db = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.balance !== undefined) updates.balance = body.balance;
  if (body.is_hidden !== undefined) updates.is_hidden = body.is_hidden;
  if (body.display_order !== undefined) updates.display_order = body.display_order;
  if (body.icon_color !== undefined) updates.icon_color = body.icon_color;
  if (body.memo !== undefined) updates.memo = body.memo;

  const { data, error } = await db
    .from("accounts")
    .update(updates)
    .eq("id", params!.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return apiError(error.message);
  return NextResponse.json(data);
});

// DELETE /api/accounts/:id
export const DELETE = withAuth(async (_req, user, params) => {
  const db = createAdminClient();
  const { error } = await db
    .from("accounts")
    .delete()
    .eq("id", params!.id)
    .eq("user_id", user.id);

  if (error) return apiError(error.message);
  return new NextResponse(null, { status: 204 });
});

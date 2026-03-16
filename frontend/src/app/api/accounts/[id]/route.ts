import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorized, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  const db = createAdminClient();

  const { data, error } = await db
    .from("accounts")
    .select(`*, financial_institutions (name, logo_url, category)`)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return apiError("Account not found", 404);
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
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
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return apiError(error.message);
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  const db = createAdminClient();

  const { error } = await db
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return apiError(error.message);
  return new NextResponse(null, { status: 204 });
}

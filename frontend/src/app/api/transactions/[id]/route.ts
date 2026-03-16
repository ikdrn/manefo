import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorized, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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
  if (body.description !== undefined) updates.description = body.description;
  if (body.memo !== undefined) updates.memo = body.memo;
  if (body.category_id !== undefined) updates.category_id = body.category_id;
  if (body.sub_category_id !== undefined) updates.sub_category_id = body.sub_category_id;
  if (body.transacted_at !== undefined) updates.transacted_at = body.transacted_at;

  const { data, error } = await db
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return apiError("Transaction not found", 404);
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

  const { error, count } = await db
    .from("transactions")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_manual", true);

  if (error || count === 0) {
    return apiError("Transaction not found or cannot delete auto-imported transactions", 404);
  }
  return new NextResponse(null, { status: 204 });
}

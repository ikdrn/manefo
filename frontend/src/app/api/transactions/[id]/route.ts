import { NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH /api/transactions/:id
export const PATCH = withAuth(async (req, user, params) => {
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
    .eq("id", params!.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return apiError("Transaction not found", 404);
  return NextResponse.json(data);
});

// DELETE /api/transactions/:id  (手動取引のみ削除可)
export const DELETE = withAuth(async (_req, user, params) => {
  const db = createAdminClient();
  const { error, count } = await db
    .from("transactions")
    .delete({ count: "exact" })
    .eq("id", params!.id)
    .eq("user_id", user.id)
    .eq("is_manual", true);

  if (error || count === 0) return apiError("Transaction not found or cannot delete auto-imported transactions", 404);
  return new NextResponse(null, { status: 204 });
});

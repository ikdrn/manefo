import { NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/holdings
export const GET = withAuth(async (_req, user) => {
  const db = createAdminClient();

  const { data, error } = await db
    .from("investment_holdings")
    .select("*, accounts (name)")
    .eq("user_id", user.id)
    .order("current_value", { ascending: false, nullsFirst: false });

  if (error) return apiError(error.message);
  return NextResponse.json(data);
});

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorized, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  const db = createAdminClient();
  const { data, error } = await db
    .from("investment_holdings")
    .select("*, accounts (name)")
    .eq("user_id", user.id)
    .order("current_value", { ascending: false, nullsFirst: false });

  if (error) return apiError(error.message);
  return NextResponse.json(data);
}

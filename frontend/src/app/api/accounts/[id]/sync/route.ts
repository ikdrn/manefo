import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorized, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/providers";
import { decryptJson } from "@/lib/crypto";
import type { AccountCredentials } from "@/lib/providers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  const db = createAdminClient();

  const { data: account, error: accErr } = await db
    .from("accounts")
    .select(`*, financial_institutions (code)`)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_manual", false)
    .single();

  if (accErr || !account) return apiError("Account not found", 404);

  const providerCode = (account.financial_institutions as { code: string } | null)?.code;
  if (!providerCode) return apiError("Institution not linked", 400);

  const provider = getProvider(providerCode);
  if (!provider) return apiError(`Provider "${providerCode}" not supported`, 400);

  const { data: credRow, error: credErr } = await db
    .from("account_credentials")
    .select("encrypted_data")
    .eq("account_id", id)
    .single();

  if (credErr || !credRow) {
    return apiError("Credentials not found. Please re-link the account.", 400);
  }

  let credentials: AccountCredentials;
  try {
    credentials = decryptJson<AccountCredentials>(credRow.encrypted_data as string);
  } catch {
    return apiError("Failed to decrypt credentials", 500);
  }

  const { data: job } = await db
    .from("sync_jobs")
    .insert({
      user_id: user.id,
      account_id: id,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  try {
    const result = await provider.sync(id, credentials);

    await db
      .from("accounts")
      .update({
        balance: result.current_balance,
        balance_updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        provider_status: "active",
        sync_error_message: null,
      })
      .eq("id", id);

    let addedCount = 0;
    if (result.transactions.length > 0) {
      const txRows = result.transactions.map((t) => ({
        user_id: user.id,
        account_id: id,
        transaction_type: t.amount > 0 ? "income" : "expense",
        amount: t.amount,
        currency: "JPY",
        description: t.description,
        transacted_at: t.transacted_at,
        balance_after: t.balance_after ?? null,
        external_id: t.external_id,
        is_manual: false,
      }));

      const { data: upserted } = await db
        .from("transactions")
        .upsert(txRows, { onConflict: "account_id,external_id", ignoreDuplicates: true })
        .select("id");

      addedCount = upserted?.length ?? 0;
    }

    await db.from("asset_snapshots").upsert(
      {
        user_id: user.id,
        account_id: id,
        snapshot_date: new Date().toISOString().slice(0, 10),
        balance: result.current_balance,
        currency: "JPY",
      },
      { onConflict: "account_id,snapshot_date" }
    );

    if (job) {
      await db
        .from("sync_jobs")
        .update({
          status: "success",
          completed_at: new Date().toISOString(),
          transactions_added: addedCount,
        })
        .eq("id", job.id);
    }

    return NextResponse.json({ status: "success", transactions_added: addedCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";

    await db
      .from("accounts")
      .update({ provider_status: "error", sync_error_message: message })
      .eq("id", id);

    if (job) {
      await db
        .from("sync_jobs")
        .update({
          status: "error",
          completed_at: new Date().toISOString(),
          error_message: message,
        })
        .eq("id", job.id);
    }

    return apiError(message, 502);
  }
}

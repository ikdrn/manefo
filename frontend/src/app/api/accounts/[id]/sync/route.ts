import { NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/providers";
import { decryptJson } from "@/lib/crypto";
import type { AccountCredentials } from "@/lib/providers";

// POST /api/accounts/:id/sync
export const POST = withAuth(async (_req, user, params) => {
  const db = createAdminClient();

  // 口座情報取得（自動取得口座のみ）
  const { data: account, error: accErr } = await db
    .from("accounts")
    .select(`*, financial_institutions (code)`)
    .eq("id", params!.id)
    .eq("user_id", user.id)
    .eq("is_manual", false)
    .single();

  if (accErr || !account) return apiError("Account not found", 404);

  const providerCode = (account.financial_institutions as { code: string })?.code;
  const provider = getProvider(providerCode);
  if (!provider) return apiError(`Provider "${providerCode}" not supported`, 400);

  // 暗号化された認証情報を取得・復号
  const { data: credRow, error: credErr } = await db
    .from("account_credentials")
    .select("encrypted_data")
    .eq("account_id", params!.id)
    .single();

  if (credErr || !credRow) return apiError("Credentials not found. Please re-link the account.", 400);

  let credentials: AccountCredentials;
  try {
    credentials = decryptJson<AccountCredentials>(credRow.encrypted_data);
  } catch {
    return apiError("Failed to decrypt credentials", 500);
  }

  // 同期ジョブ開始を記録
  const { data: job } = await db
    .from("sync_jobs")
    .insert({ user_id: user.id, account_id: params!.id, status: "running", started_at: new Date().toISOString() })
    .select("id")
    .single();

  try {
    const result = await provider.sync(params!.id, credentials);

    // 残高更新
    await db
      .from("accounts")
      .update({ balance: result.current_balance, balance_updated_at: new Date().toISOString(), last_synced_at: new Date().toISOString(), provider_status: "active", sync_error_message: null })
      .eq("id", params!.id);

    // 取引を upsert（external_id で重複防止）
    let addedCount = 0;
    if (result.transactions.length > 0) {
      const txRows = result.transactions.map((t) => ({
        user_id: user.id,
        account_id: params!.id,
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

    // スナップショット記録
    await db.from("asset_snapshots").upsert({
      user_id: user.id,
      account_id: params!.id,
      snapshot_date: new Date().toISOString().slice(0, 10),
      balance: result.current_balance,
      currency: "JPY",
    }, { onConflict: "account_id,snapshot_date" });

    // ジョブ完了
    if (job) {
      await db.from("sync_jobs").update({ status: "success", completed_at: new Date().toISOString(), transactions_added: addedCount }).eq("id", job.id);
    }

    return NextResponse.json({ status: "success", transactions_added: addedCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await db.from("accounts").update({ provider_status: "error", sync_error_message: message }).eq("id", params!.id);
    if (job) {
      await db.from("sync_jobs").update({ status: "error", completed_at: new Date().toISOString(), error_message: message }).eq("id", job.id);
    }
    return apiError(message, 502);
  }
});

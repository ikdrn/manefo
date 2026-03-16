import { createClient } from "@supabase/supabase-js";

/**
 * Service Role クライアント（APIルート専用）
 * RLSをバイパスできるため、絶対にクライアントに渡してはいけない
 * このファイルは server-only なモジュールとしてのみ使用する
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

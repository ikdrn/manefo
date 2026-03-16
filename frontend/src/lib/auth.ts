import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export interface AuthUser {
  id: string;
  email?: string;
}

/**
 * リクエストのSupabaseセッションを検証し、認証済みユーザーを返す。
 * 未認証の場合は null を返す。
 *
 * Next.js 15 Route Handler で直接呼び出す形式（HOCではない）。
 * 各ルートで以下のように使う:
 *
 *   const user = await getSessionUser(req);
 *   if (!user) return unauthorized();
 */
export async function getSessionUser(req: NextRequest): Promise<AuthUser | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () =>
          req.cookies.getAll().map(({ name, value }) => ({ name, value })),
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { id: user.id, email: user.email ?? undefined };
}

export const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export const apiError = (message: string, status = 500) =>
  NextResponse.json({ error: message }, { status });

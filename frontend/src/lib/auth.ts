import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export interface AuthUser {
  id: string;
  email?: string;
}

type ApiHandler = (
  req: NextRequest,
  user: AuthUser,
  params?: Record<string, string>
) => Promise<NextResponse>;

/**
 * APIルートの認証ラッパー
 * Supabase Authで認証済みユーザーのみ通過させる
 */
export function withAuth(handler: ApiHandler) {
  return async (
    req: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const params = context?.params ? await context.params : {};

    // Supabase SSRクライアントでセッション確認
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => {
            return req.cookies
              .getAll()
              .map(({ name, value }) => ({ name, value }));
          },
          setAll: () => {},
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return handler(req, { id: user.id, email: user.email }, params);
  };
}

/**
 * APIエラーレスポンスのヘルパー
 */
export const apiError = (
  message: string,
  status = 500
): NextResponse =>
  NextResponse.json({ error: message }, { status });

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, UserPlus, TrendingUp } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("パスワードは8文字以上で設定してください");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogleSignup() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError("Google 登録に失敗しました");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#111827] px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white dark:bg-[#1F2937] rounded-xl shadow-sm border border-[#E5E7EB] dark:border-[#374151] p-8">
            <div className="w-12 h-12 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">確認メールを送信しました</h2>
            <p className="text-sm text-[#4B5563]">
              {email} に確認リンクを送信しました。
              メールをご確認のうえ、リンクをクリックしてアカウントを有効化してください。
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm text-[#0F62FE] hover:underline"
            >
              ログインページへ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#111827] px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-[#0F62FE] rounded-lg flex items-center justify-center">
            <TrendingUp size={18} className="text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">manefo</span>
        </div>

        <div className="bg-white dark:bg-[#1F2937] rounded-xl shadow-sm border border-[#E5E7EB] dark:border-[#374151] p-8">
          <h1 className="text-xl font-semibold mb-2 text-center">新規登録</h1>
          <p className="text-sm text-[#4B5563] text-center mb-6">
            完全無料・広告なし・全機能開放
          </p>

          <button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-[#E5E7EB] dark:border-[#374151] rounded-lg text-sm font-medium hover:bg-[#F9FAFB] dark:hover:bg-[#374151] transition-colors mb-6 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google で登録
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E7EB] dark:border-[#374151]" />
            </div>
            <div className="relative flex justify-center text-xs text-[#9CA3AF]">
              <span className="px-3 bg-white dark:bg-[#1F2937]">または</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">表示名</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#0F62FE] focus:border-transparent transition-shadow"
                placeholder="山田 太郎"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#0F62FE] focus:border-transparent transition-shadow"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">パスワード</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#0F62FE] focus:border-transparent transition-shadow"
                  placeholder="8文字以上"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0F62FE] hover:bg-[#0353E9] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              アカウント作成
            </button>
          </form>

          <p className="text-center text-sm text-[#4B5563] mt-6">
            既にアカウントをお持ちの方は{" "}
            <Link href="/login" className="text-[#0F62FE] hover:underline font-medium">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

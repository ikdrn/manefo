"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Bell, Moon, Sun, LogOut, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface HeaderProps {
  user: User;
  netWorth?: number;
}

export default function Header({ user, netWorth }: HeaderProps) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function toggleDarkMode() {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "ユーザー";

  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-white dark:bg-[#1F2937] border-b border-[#E5E7EB] dark:border-[#374151] flex items-center px-4 gap-4">
      {/* ロゴ */}
      <Link
        href="/"
        className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
      >
        <div className="w-7 h-7 bg-[#0F62FE] rounded-md flex items-center justify-center">
          <TrendingUp size={15} className="text-white" />
        </div>
        <span className="font-semibold text-sm tracking-tight hidden sm:block">
          manefo
        </span>
      </Link>

      {/* 資産総額（ヘッダー小表示） */}
      {netWorth !== undefined && (
        <div className="hidden md:block ml-4 text-sm">
          <span className="text-[#4B5563] dark:text-[#9CA3AF] text-xs mr-1">
            純資産
          </span>
          <span className="font-semibold tabular-nums">
            {formatCurrency(netWorth)}
          </span>
        </div>
      )}

      <div className="flex-1" />

      {/* アクションボタン群 */}
      <div className="flex items-center gap-1">
        {/* 通知 */}
        <button className="relative p-2 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#374151] transition-colors">
          <Bell size={18} className="text-[#4B5563] dark:text-[#9CA3AF]" />
          {/* 未読バッジ */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#DC2626] rounded-full" />
        </button>

        {/* テーマ切替 */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#374151] transition-colors"
          aria-label={darkMode ? "ライトモード" : "ダークモード"}
        >
          {darkMode ? (
            <Sun size={18} className="text-[#4B5563] dark:text-[#9CA3AF]" />
          ) : (
            <Moon size={18} className="text-[#4B5563] dark:text-[#9CA3AF]" />
          )}
        </button>

        {/* ユーザーメニュー */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#374151] transition-colors"
          >
            <div className="w-7 h-7 bg-[#0F62FE] rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {initials}
            </div>
            <span className="hidden sm:block text-sm font-medium max-w-24 truncate">
              {displayName}
            </span>
            <ChevronDown
              size={14}
              className={`text-[#9CA3AF] transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 w-48 bg-white dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded-lg shadow-md py-1 z-50">
              <div className="px-3 py-2 border-b border-[#E5E7EB] dark:border-[#374151]">
                <p className="text-xs text-[#9CA3AF]">ログイン中</p>
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-[#374151] transition-colors"
              >
                <LogOut size={14} />
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

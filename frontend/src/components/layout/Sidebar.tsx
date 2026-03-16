"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  ReceiptText,
  BarChart3,
  Settings,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/format";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "ダッシュボード" },
  { href: "/accounts", icon: CreditCard, label: "口座一覧" },
  { href: "/transactions", icon: ReceiptText, label: "取引明細" },
  { href: "/reports", icon: BarChart3, label: "レポート" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-56 bg-white dark:bg-[#1F2937] border-r border-[#E5E7EB] dark:border-[#374151] hidden md:flex flex-col z-40">
      {/* 口座追加ボタン */}
      <div className="p-3">
        <Link
          href="/accounts/add"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-[#0F62FE] hover:bg-[#0353E9] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <PlusCircle size={15} />
          口座を追加
        </Link>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 px-2 py-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5",
                isActive
                  ? "bg-[#D0E2FF] text-[#0F62FE] dark:bg-[#1e3a5f] dark:text-[#60A5FA]"
                  : "text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#374151]"
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 設定 */}
      <div className="p-2 border-t border-[#E5E7EB] dark:border-[#374151]">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#374151] transition-colors"
        >
          <Settings size={17} />
          設定
        </Link>
      </div>
    </aside>
  );
}

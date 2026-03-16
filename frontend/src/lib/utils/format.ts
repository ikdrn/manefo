// =============================================================================
// 数値・日付フォーマットユーティリティ
// =============================================================================

/**
 * 金額を日本円表示にフォーマット
 * 欠損値は「—」を返す
 */
export function formatCurrency(
  value: number | null | undefined,
  options?: {
    showSign?: boolean;  // +/-符号を表示
    compact?: boolean;   // 億・万単位で省略
    currency?: string;
  }
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }

  const currency = options?.currency ?? "JPY";

  if (options?.compact) {
    if (Math.abs(value) >= 100_000_000) {
      const v = value / 100_000_000;
      return `${options.showSign && v > 0 ? "+" : ""}¥${v.toFixed(1)}億`;
    }
    if (Math.abs(value) >= 10_000) {
      const v = value / 10_000;
      return `${options.showSign && v > 0 ? "+" : ""}¥${v.toFixed(1)}万`;
    }
  }

  const formatted = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));

  if (options?.showSign) {
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
  }
  if (value < 0) return `-${formatted}`;
  return formatted;
}

/**
 * パーセント表示（小数点1桁）
 */
export function formatPercent(
  value: number | null | undefined,
  options?: { showSign?: boolean; digits?: number }
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  const digits = options?.digits ?? 2;
  const pct = (value * 100).toFixed(digits);
  if (options?.showSign && value > 0) return `+${pct}%`;
  return `${pct}%`;
}

/**
 * 日付フォーマット
 */
export function formatDate(
  dateStr: string | null | undefined,
  format: "date" | "datetime" | "relative" = "date"
): string {
  if (!dateStr) return "—";

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";

  if (format === "relative") {
    return formatRelativeDate(date);
  }

  if (format === "datetime") {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay === 1) return "昨日";
  if (diffDay < 7) return `${diffDay}日前`;

  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * 変化量の色クラスを返す（Tailwind）
 */
export function getChangeColor(value: number | null | undefined): string {
  if (!value) return "text-gray-400";
  if (value > 0) return "text-green-600";
  if (value < 0) return "text-red-600";
  return "text-gray-400";
}

/**
 * 異常値検出（±30%超で警告）
 */
export function isAbnormalChange(pct: number | null | undefined): boolean {
  if (!pct) return false;
  return Math.abs(pct) > 0.3;
}

/**
 * clsx + tailwind-merge
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

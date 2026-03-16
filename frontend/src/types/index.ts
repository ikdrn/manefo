// =============================================================================
// manefo 共有型定義
// =============================================================================

// ---------------------------------------------------------------------------
// 金融機関
// ---------------------------------------------------------------------------
export interface FinancialInstitution {
  id: string;
  code: string;
  name: string;
  name_en?: string;
  logo_url?: string;
  category: "bank" | "securities" | "credit_card" | "crypto" | "other";
  provider_class: string;
  is_active: boolean;
  sort_order: number;
}

// ---------------------------------------------------------------------------
// 口座
// ---------------------------------------------------------------------------
export type AccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "investment"
  | "loan"
  | "point"
  | "crypto"
  | "pension"
  | "other";

export type AssetClass = "asset" | "liability";

export type ProviderStatus = "active" | "needs_login" | "error" | "disabled";

export interface Account {
  id: string;
  user_id: string;
  institution_id?: string;
  name: string;
  official_name?: string;
  account_type: AccountType;
  asset_class: AssetClass;
  currency: string;
  balance: number;
  balance_updated_at?: string;
  is_manual: boolean;
  is_hidden: boolean;
  display_order: number;
  icon_color?: string;
  memo?: string;
  provider_status?: ProviderStatus;
  last_synced_at?: string;
  sync_error_message?: string;
  created_at: string;
  updated_at: string;
  // JOIN
  institution_name?: string;
  institution_logo?: string;
  institution_category?: string;
}

// ---------------------------------------------------------------------------
// 取引
// ---------------------------------------------------------------------------
export type TransactionType = "income" | "expense" | "transfer";

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  transfer_pair_id?: string;
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  balance_after?: number;
  description: string;
  memo?: string;
  category_id?: string;
  sub_category_id?: string;
  is_income: boolean;
  is_transfer: boolean;
  transacted_at: string;
  is_manual: boolean;
  external_id?: string;
  created_at: string;
  updated_at: string;
  // JOIN
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  account_name?: string;
}

// ---------------------------------------------------------------------------
// カテゴリ
// ---------------------------------------------------------------------------
export interface Category {
  id: string;
  user_id?: string;
  parent_id?: string;
  name: string;
  icon?: string;
  color?: string;
  category_type: TransactionType;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  children?: Category[];
}

// ---------------------------------------------------------------------------
// 資産スナップショット（グラフ用）
// ---------------------------------------------------------------------------
export interface AssetSnapshot {
  id: string;
  user_id: string;
  account_id: string;
  snapshot_date: string;  // YYYY-MM-DD
  balance: number;
  currency: string;
  jpy_rate: number;
  balance_jpy: number;
}

// グラフ描画用に集約したデータポイント
export interface AssetDataPoint {
  date: string;           // YYYY-MM-DD
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  breakdown: Record<string, number>;  // account_id → balance
}

// ---------------------------------------------------------------------------
// 保有銘柄
// ---------------------------------------------------------------------------
export interface InvestmentHolding {
  id: string;
  user_id: string;
  account_id: string;
  ticker: string;
  name: string;
  security_type: string;
  quantity: number;
  average_cost: number;
  current_price?: number;
  current_value?: number;
  unrealized_pnl?: number;
  unrealized_pnl_pct?: number;
  currency: string;
  price_updated_at?: string;
}

// ---------------------------------------------------------------------------
// 資産サマリー（ホーム画面用）
// ---------------------------------------------------------------------------
export interface AssetSummary {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  // 前日比・前月比
  daily_change?: number;
  daily_change_pct?: number;
  monthly_change?: number;
  monthly_change_pct?: number;
  as_of: string;
}

// ---------------------------------------------------------------------------
// 収支サマリー
// ---------------------------------------------------------------------------
export interface MonthlySummary {
  month: string;  // YYYY-MM-01
  total_income: number;
  total_expense: number;
  net: number;
}

export interface CategorySummary {
  category_id?: string;
  category_name: string;
  category_icon?: string;
  category_color?: string;
  total_amount: number;
  transaction_count: number;
  percentage?: number;
}

// ---------------------------------------------------------------------------
// 予算
// ---------------------------------------------------------------------------
export interface Budget {
  id: string;
  user_id: string;
  category_id?: string;
  budget_month: string;
  amount: number;
  // 計算済み
  spent?: number;
  remaining?: number;
  progress_pct?: number;
}

// ---------------------------------------------------------------------------
// 通知
// ---------------------------------------------------------------------------
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// ユーザープロファイル
// ---------------------------------------------------------------------------
export interface Profile {
  id: string;
  display_name?: string;
  avatar_url?: string;
  preferred_currency: string;
  timezone: string;
  dark_mode: boolean;
  notification_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// UIユーティリティ型
// ---------------------------------------------------------------------------

// 金額表示フォーマット
export type CurrencyDisplay = "symbol" | "code" | "none";

// 期間フィルター
export type DateRange =
  | "1w"
  | "1m"
  | "3m"
  | "6m"
  | "1y"
  | "3y"
  | "5y"
  | "all";

// チャートタイプ
export type ChartType = "line" | "area" | "bar";

// ページネーション
export interface PaginationParams {
  page: number;
  per_page: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// APIエラー
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

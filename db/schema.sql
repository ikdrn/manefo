-- =============================================================================
-- manefo Database Schema
-- PostgreSQL 15 / Supabase
--
-- 設計方針:
--   - 全テーブルに RLS (Row Level Security) を適用
--   - ユーザーは自分のデータのみ参照・操作可能
--   - 口座認証情報は encrypted_credentials (AES-256-GCM) で保存
--   - 全操作は audit_logs に記録
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- あいまい検索（取引メモ等）

-- ---------------------------------------------------------------------------
-- Custom Types（ENUM）
-- ---------------------------------------------------------------------------

-- 口座種別
CREATE TYPE account_type AS ENUM (
  'checking',       -- 普通預金
  'savings',        -- 定期預金
  'credit_card',    -- クレジットカード
  'investment',     -- 証券口座（株・投信）
  'loan',           -- ローン・住宅ローン
  'point',          -- ポイント残高
  'crypto',         -- 暗号資産
  'pension',        -- 年金・iDeCo・NISA
  'other'
);

-- 取引種別
CREATE TYPE transaction_type AS ENUM (
  'income',         -- 収入
  'expense',        -- 支出
  'transfer'        -- 振替（口座間移動）
);

-- 資産/負債
CREATE TYPE asset_class AS ENUM (
  'asset',   -- 資産
  'liability' -- 負債
);

-- 口座連携ステータス
CREATE TYPE provider_status AS ENUM (
  'active',        -- 正常連携中
  'needs_login',   -- 再ログイン必要
  'error',         -- エラー
  'disabled'       -- 無効化済み
);

-- 監査ログアクション
CREATE TYPE audit_action AS ENUM (
  'create', 'read', 'update', 'delete',
  'login', 'logout',
  'account_link', 'account_unlink',
  'sync_start', 'sync_complete', 'sync_error'
);

-- ---------------------------------------------------------------------------
-- 1. profiles
--    Supabase Auth の auth.users を拡張するユーザープロファイル
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      TEXT,
  avatar_url        TEXT,
  preferred_currency CHAR(3) NOT NULL DEFAULT 'JPY',
  timezone          TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  dark_mode         BOOLEAN NOT NULL DEFAULT FALSE,
  notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. financial_institutions
--    対応金融機関マスタ（システム管理）
-- ---------------------------------------------------------------------------
CREATE TABLE financial_institutions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          TEXT UNIQUE NOT NULL,       -- 'mizuho', 'mufg', 'smbc', 'rakuten_bank', 'sbi_sec', etc.
  name          TEXT NOT NULL,              -- '楽天銀行'
  name_en       TEXT,
  logo_url      TEXT,
  category      TEXT NOT NULL,              -- 'bank' | 'securities' | 'credit_card' | 'crypto' | 'other'
  provider_class TEXT NOT NULL,             -- Rustの実装クラス名
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INT NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. accounts
--    ユーザーの連携口座
-- ---------------------------------------------------------------------------
CREATE TABLE accounts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id        UUID REFERENCES financial_institutions(id),
  name                  TEXT NOT NULL,           -- '楽天銀行 普通'（ユーザー設定可）
  official_name         TEXT,                    -- 金融機関から取得した正式名称
  account_type          account_type NOT NULL,
  asset_class           asset_class NOT NULL DEFAULT 'asset',
  currency              CHAR(3) NOT NULL DEFAULT 'JPY',
  balance               NUMERIC(20, 4) NOT NULL DEFAULT 0,
  balance_updated_at    TIMESTAMPTZ,
  is_manual             BOOLEAN NOT NULL DEFAULT FALSE,  -- 手動入力口座
  is_hidden             BOOLEAN NOT NULL DEFAULT FALSE,
  display_order         INT NOT NULL DEFAULT 100,
  icon_color            TEXT,                            -- ユーザーカスタム色
  memo                  TEXT,
  -- 連携情報（自動取得口座）
  provider_status       provider_status DEFAULT 'active',
  last_synced_at        TIMESTAMPTZ,
  sync_error_message    TEXT,
  -- 認証情報（暗号化済み）はaccount_credentialsテーブル参照
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4. account_credentials
--    口座認証情報（AES-256-GCM暗号化）
--    バックエンドのみ読み取り可（RLSでフロントからブロック）
-- ---------------------------------------------------------------------------
CREATE TABLE account_credentials (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id        UUID NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 暗号化済みJSONペイロード（login_id, password, totp_secret 等を含む）
  encrypted_data    BYTEA NOT NULL,
  -- 暗号化メタ（nonce/iv等は暗号文に含めるがバージョン管理のため）
  encryption_version SMALLINT NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. transactions
--    取引明細（自動取得 + 手動入力）
-- ---------------------------------------------------------------------------
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- 振替の場合、相手口座
  transfer_pair_id UUID REFERENCES transactions(id),
  transaction_type transaction_type NOT NULL,
  amount          NUMERIC(20, 4) NOT NULL,   -- 正値（収入）/ 負値（支出）
  currency        CHAR(3) NOT NULL DEFAULT 'JPY',
  balance_after   NUMERIC(20, 4),            -- 取引後残高（取得できた場合）
  description     TEXT NOT NULL DEFAULT '',  -- 取引明細名
  memo            TEXT,                      -- ユーザーメモ
  category_id     UUID,                      -- categories参照（後述）
  sub_category_id UUID,
  is_income       BOOLEAN GENERATED ALWAYS AS (transaction_type = 'income') STORED,
  is_transfer     BOOLEAN GENERATED ALWAYS AS (transaction_type = 'transfer') STORED,
  transacted_at   TIMESTAMPTZ NOT NULL,      -- 取引日時
  -- 取得元情報
  is_manual       BOOLEAN NOT NULL DEFAULT FALSE,
  external_id     TEXT,                      -- 金融機関側の取引ID（重複防止）
  raw_data        JSONB,                     -- スクレイピング生データ（デバッグ用）
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (account_id, external_id)           -- 同一口座での重複取引防止
);

-- ---------------------------------------------------------------------------
-- 6. categories
--    取引カテゴリ（システム標準 + ユーザーカスタム）
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULLはシステム標準
  parent_id   UUID REFERENCES categories(id),
  name        TEXT NOT NULL,
  icon        TEXT,          -- Lucideアイコン名
  color       TEXT,          -- HEXカラー
  category_type transaction_type NOT NULL,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INT NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 外部キー追加（循環参照回避のため後で）
ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) REFERENCES categories(id),
  ADD CONSTRAINT fk_transactions_sub_category FOREIGN KEY (sub_category_id) REFERENCES categories(id);

-- ---------------------------------------------------------------------------
-- 7. asset_snapshots
--    資産残高スナップショット（資産推移グラフ用）
--    毎日深夜バッチで口座残高を記録
-- ---------------------------------------------------------------------------
CREATE TABLE asset_snapshots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  balance         NUMERIC(20, 4) NOT NULL,
  currency        CHAR(3) NOT NULL DEFAULT 'JPY',
  jpy_rate        NUMERIC(20, 8) NOT NULL DEFAULT 1.0,  -- JPY換算レート
  balance_jpy     NUMERIC(20, 4) GENERATED ALWAYS AS (balance * jpy_rate) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (account_id, snapshot_date)
);

-- ---------------------------------------------------------------------------
-- 8. investment_holdings
--    保有銘柄（証券口座）
-- ---------------------------------------------------------------------------
CREATE TABLE investment_holdings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ticker              TEXT NOT NULL,          -- '7203.T', 'AAPL', '03311187' (投信コード)
  name                TEXT NOT NULL,          -- '三菱UFJ フィナンシャル'
  security_type       TEXT NOT NULL,          -- 'stock_jp', 'stock_us', 'mutual_fund', 'etf', 'bond', 'reit'
  quantity            NUMERIC(20, 8) NOT NULL,
  average_cost        NUMERIC(20, 4) NOT NULL,  -- 取得単価
  current_price       NUMERIC(20, 4),
  current_value       NUMERIC(20, 4) GENERATED ALWAYS AS (quantity * current_price) STORED,
  unrealized_pnl      NUMERIC(20, 4) GENERATED ALWAYS AS (quantity * (current_price - average_cost)) STORED,
  unrealized_pnl_pct  NUMERIC(10, 6) GENERATED ALWAYS AS (
    CASE WHEN average_cost > 0
    THEN (current_price - average_cost) / average_cost
    ELSE 0
    END
  ) STORED,
  currency            CHAR(3) NOT NULL DEFAULT 'JPY',
  price_updated_at    TIMESTAMPTZ,
  last_synced_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (account_id, ticker)
);

-- ---------------------------------------------------------------------------
-- 9. budgets
--    予算設定（月次）
-- ---------------------------------------------------------------------------
CREATE TABLE budgets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES categories(id),
  budget_month  DATE NOT NULL,    -- YYYY-MM-01
  amount        NUMERIC(20, 4) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, category_id, budget_month)
);

-- ---------------------------------------------------------------------------
-- 10. recurring_transactions
--     定期取引テンプレート（家賃・サブスク等）
-- ---------------------------------------------------------------------------
CREATE TABLE recurring_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      UUID REFERENCES accounts(id),
  category_id     UUID REFERENCES categories(id),
  name            TEXT NOT NULL,
  amount          NUMERIC(20, 4) NOT NULL,
  transaction_type transaction_type NOT NULL,
  frequency       TEXT NOT NULL,  -- 'monthly', 'yearly', 'weekly'
  next_date       DATE NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 11. notifications
--     通知（残高アラート・定期取引リマインド等）
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  type          TEXT NOT NULL,    -- 'balance_alert', 'sync_error', 'report_ready', etc.
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 12. sync_jobs
--     口座同期ジョブの実行履歴
-- ---------------------------------------------------------------------------
CREATE TABLE sync_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      UUID REFERENCES accounts(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending','running','success','error'
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  transactions_added   INT NOT NULL DEFAULT 0,
  transactions_updated INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 13. audit_logs
--     セキュリティ監査ログ（全操作記録）
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id),
  action      audit_action NOT NULL,
  table_name  TEXT,
  record_id   UUID,
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- インデックス
-- =============================================================================

-- accounts
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_institution_id ON accounts(institution_id);
CREATE INDEX idx_accounts_type ON accounts(account_type);

-- transactions (最も頻繁にクエリされる)
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_transacted_at ON transactions(transacted_at DESC);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transacted_at DESC);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_description_trgm ON transactions USING GIN (description gin_trgm_ops);

-- asset_snapshots（グラフ取得）
CREATE INDEX idx_asset_snapshots_user_date ON asset_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_asset_snapshots_account_date ON asset_snapshots(account_id, snapshot_date DESC);

-- investment_holdings
CREATE INDEX idx_investment_holdings_user_id ON investment_holdings(user_id);
CREATE INDEX idx_investment_holdings_account_id ON investment_holdings(account_id);

-- notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- sync_jobs
CREATE INDEX idx_sync_jobs_user_id ON sync_jobs(user_id);
CREATE INDEX idx_sync_jobs_account_id ON sync_jobs(account_id);

-- audit_logs（時系列検索）
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =============================================================================
-- Triggers（updated_at 自動更新）
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_account_credentials_updated_at
  BEFORE UPDATE ON account_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_investment_holdings_updated_at
  BEFORE UPDATE ON investment_holdings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- profile自動生成（Supabase Authサインアップ時）
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

-- RLS有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- financial_institutions は全ユーザーが読み取り可
ALTER TABLE financial_institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_institutions: anyone can read"
  ON financial_institutions FOR SELECT USING (TRUE);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE POLICY "profiles: users can read own"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: users can update own"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------
CREATE POLICY "accounts: users can CRUD own"
  ON accounts FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- account_credentials
--    フロントエンド（anon key）からは一切アクセス不可
--    バックエンドのみ service_role で操作
-- ---------------------------------------------------------------------------
CREATE POLICY "account_credentials: service role only"
  ON account_credentials FOR ALL TO service_role USING (TRUE);

-- 一般ユーザーは読み取り不可（RLSによりブロック）
-- 追加ポリシーなし → デフォルトDENY

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
CREATE POLICY "transactions: users can CRUD own"
  ON transactions FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
CREATE POLICY "categories: read system and own"
  ON categories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "categories: insert own"
  ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories: update own"
  ON categories FOR UPDATE USING (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "categories: delete own"
  ON categories FOR DELETE USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- asset_snapshots
-- ---------------------------------------------------------------------------
CREATE POLICY "asset_snapshots: users can CRUD own"
  ON asset_snapshots FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- investment_holdings
-- ---------------------------------------------------------------------------
CREATE POLICY "investment_holdings: users can CRUD own"
  ON investment_holdings FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- budgets
-- ---------------------------------------------------------------------------
CREATE POLICY "budgets: users can CRUD own"
  ON budgets FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- recurring_transactions
-- ---------------------------------------------------------------------------
CREATE POLICY "recurring_transactions: users can CRUD own"
  ON recurring_transactions FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
CREATE POLICY "notifications: users can read and update own"
  ON notifications FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- sync_jobs
-- ---------------------------------------------------------------------------
CREATE POLICY "sync_jobs: users can read own"
  ON sync_jobs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sync_jobs: service role full access"
  ON sync_jobs FOR ALL TO service_role USING (TRUE);

-- ---------------------------------------------------------------------------
-- audit_logs
--    ユーザーは自分のログのみ読み取り可。書き込みはservice_roleのみ。
-- ---------------------------------------------------------------------------
CREATE POLICY "audit_logs: users can read own"
  ON audit_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "audit_logs: service role full access"
  ON audit_logs FOR ALL TO service_role USING (TRUE);

-- =============================================================================
-- Views（よく使うクエリをビューで最適化）
-- =============================================================================

-- 資産サマリー（ユーザーごとの口座別最新残高）
CREATE OR REPLACE VIEW v_account_summary AS
SELECT
  a.id AS account_id,
  a.user_id,
  a.name,
  a.account_type,
  a.asset_class,
  a.currency,
  a.balance,
  a.balance_updated_at,
  a.provider_status,
  a.last_synced_at,
  a.is_manual,
  a.is_hidden,
  a.display_order,
  fi.name AS institution_name,
  fi.logo_url AS institution_logo,
  fi.category AS institution_category
FROM accounts a
LEFT JOIN financial_institutions fi ON a.institution_id = fi.id
WHERE a.is_hidden = FALSE;

-- 月次収支サマリー
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
  user_id,
  DATE_TRUNC('month', transacted_at)::DATE AS month,
  transaction_type,
  SUM(ABS(amount)) AS total_amount,
  COUNT(*) AS transaction_count
FROM transactions
WHERE is_transfer = FALSE
GROUP BY user_id, DATE_TRUNC('month', transacted_at)::DATE, transaction_type;

-- カテゴリ別月次集計
CREATE OR REPLACE VIEW v_category_monthly AS
SELECT
  t.user_id,
  DATE_TRUNC('month', t.transacted_at)::DATE AS month,
  c.id AS category_id,
  c.name AS category_name,
  c.icon AS category_icon,
  c.color AS category_color,
  t.transaction_type,
  SUM(ABS(t.amount)) AS total_amount,
  COUNT(*) AS transaction_count
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.is_transfer = FALSE
GROUP BY t.user_id, DATE_TRUNC('month', t.transacted_at)::DATE,
         c.id, c.name, c.icon, c.color, t.transaction_type;

-- ユーザー総資産（資産 - 負債）
CREATE OR REPLACE VIEW v_net_worth AS
SELECT
  user_id,
  SUM(CASE WHEN asset_class = 'asset' THEN balance ELSE 0 END) AS total_assets,
  SUM(CASE WHEN asset_class = 'liability' THEN ABS(balance) ELSE 0 END) AS total_liabilities,
  SUM(CASE WHEN asset_class = 'asset' THEN balance ELSE -ABS(balance) END) AS net_worth
FROM accounts
WHERE is_hidden = FALSE
GROUP BY user_id;

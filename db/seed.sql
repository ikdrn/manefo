-- =============================================================================
-- manefo Seed Data
-- テストユーザー + ダミーデータ
--
-- 使い方:
--   supabase db reset  （schema.sql + seed.sql を自動適用）
--   または
--   psql $DATABASE_URL -f db/seed.sql
--
-- 注意: 本番環境では絶対に実行しないこと
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 金融機関マスタ
-- ---------------------------------------------------------------------------
INSERT INTO financial_institutions (code, name, name_en, category, provider_class, sort_order) VALUES
('mizuho',          'みずほ銀行',               'Mizuho Bank',             'bank',        'MizuhoProvider',        10),
('mufg',            '三菱UFJ銀行',              'MUFG Bank',               'bank',        'MufgProvider',          20),
('smbc',            '三井住友銀行',             'SMBC',                    'bank',        'SmbcProvider',          30),
('rakuten_bank',    '楽天銀行',                 'Rakuten Bank',            'bank',        'RakutenBankProvider',   40),
('sbi_bank',        '住信SBIネット銀行',        'SBI Sumishin Net Bank',   'bank',        'SbiBankProvider',       50),
('japan_post_bank', 'ゆうちょ銀行',             'Japan Post Bank',         'bank',        'JapanPostBankProvider', 60),
('seven_bank',      'セブン銀行',               'Seven Bank',              'bank',        'SevenBankProvider',     70),
('sbi_sec',         'SBI証券',                  'SBI Securities',          'securities',  'SbiSecProvider',        110),
('rakuten_sec',     '楽天証券',                 'Rakuten Securities',      'securities',  'RakutenSecProvider',    120),
('monex',           'マネックス証券',           'Monex Securities',        'securities',  'MonexProvider',         130),
('aukabu',          'auカブコム証券',           'au Kabucom Securities',   'securities',  'AukabuProvider',        140),
('matsui',          '松井証券',                 'Matsui Securities',       'securities',  'MatsuiProvider',        150),
('smbc_nikko',      'SMBC日興証券',             'SMBC Nikko Securities',   'securities',  'SmbcNikkoProvider',     160),
('nomura',          '野村証券',                 'Nomura Securities',       'securities',  'NomuraProvider',        170),
('rakuten_card',    '楽天カード',               'Rakuten Card',            'credit_card', 'RakutenCardProvider',   210),
('smbc_card',       '三井住友カード',           'SMBC Card',               'credit_card', 'SmbcCardProvider',      220),
('mufg_card',       'MUFGカード',               'MUFG Card',               'credit_card', 'MufgCardProvider',      230),
('jcb',             'JCBカード',                'JCB Card',                'credit_card', 'JcbProvider',           240),
('amex',            'American Express',         'American Express',        'credit_card', 'AmexProvider',          250),
('bitflyer',        'bitFlyer',                 'bitFlyer',                'crypto',      'BitflyerProvider',      310),
('coincheck',       'Coincheck',                'Coincheck',               'crypto',      'CoincheckProvider',     320)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- システム標準カテゴリ（user_id = NULL）
-- ---------------------------------------------------------------------------

-- 収入カテゴリ
WITH income_parent AS (
  INSERT INTO categories (name, icon, color, category_type, is_system, sort_order) VALUES
  ('収入', 'trending-up', '#16A34A', 'income', TRUE, 1)
  RETURNING id
)
INSERT INTO categories (parent_id, name, icon, color, category_type, is_system, sort_order)
SELECT
  (SELECT id FROM income_parent),
  name, icon, color, 'income', TRUE, sort_order
FROM (VALUES
  ('給与・賞与',   'briefcase',    '#16A34A', 10),
  ('副業・フリーランス', 'laptop', '#16A34A', 20),
  ('投資・配当',   'bar-chart-2',  '#16A34A', 30),
  ('年金・保険',   'shield',       '#16A34A', 40),
  ('贈与・仕送り', 'gift',         '#16A34A', 50),
  ('その他収入',   'plus-circle',  '#16A34A', 99)
) AS t(name, icon, color, sort_order);

-- 支出カテゴリ
WITH expense_parent AS (
  INSERT INTO categories (name, icon, color, category_type, is_system, sort_order) VALUES
  ('食費', 'utensils', '#DC2626', 'expense', TRUE, 10)
  RETURNING id
)
INSERT INTO categories (parent_id, name, icon, color, category_type, is_system, sort_order)
SELECT
  (SELECT id FROM expense_parent),
  name, icon, color, 'expense', TRUE, sort_order
FROM (VALUES
  ('外食・カフェ', 'coffee', '#DC2626', 10),
  ('スーパー・食料品', 'shopping-cart', '#DC2626', 20),
  ('コンビニ', 'store', '#DC2626', 30)
) AS t(name, icon, color, sort_order);

INSERT INTO categories (name, icon, color, category_type, is_system, sort_order) VALUES
('住居費',       'home',         '#6B7280', 'expense', TRUE, 20),
('交通費',       'car',          '#6B7280', 'expense', TRUE, 30),
('通信費',       'smartphone',   '#6B7280', 'expense', TRUE, 40),
('光熱費',       'zap',          '#6B7280', 'expense', TRUE, 50),
('医療・健康',   'heart',        '#6B7280', 'expense', TRUE, 60),
('日用品・雑貨', 'package',      '#6B7280', 'expense', TRUE, 70),
('衣服・美容',   'shirt',        '#6B7280', 'expense', TRUE, 80),
('娯楽・趣味',   'smile',        '#6B7280', 'expense', TRUE, 90),
('教育・教養',   'book-open',    '#6B7280', 'expense', TRUE, 100),
('保険',         'shield',       '#6B7280', 'expense', TRUE, 110),
('税金・社会保険', 'landmark',   '#6B7280', 'expense', TRUE, 120),
('ローン返済',   'credit-card',  '#6B7280', 'expense', TRUE, 130),
('サブスク・月額', 'repeat',     '#6B7280', 'expense', TRUE, 140),
('交際費',       'users',        '#6B7280', 'expense', TRUE, 150),
('その他支出',   'more-horizontal', '#6B7280', 'expense', TRUE, 199);

-- ---------------------------------------------------------------------------
-- テストユーザー（Supabase Auth にはSupabase CLI経由で作成）
-- ここでは profiles + 口座データをダミーUUIDで挿入
--
-- ローカル開発では以下のメールで登録:
--   test@manefo.local / password: Test1234!
--   admin@manefo.local / password: Admin1234!
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  -- ダミーユーザーID（実際はSupabase Authが発行するUUID）
  v_user1 UUID := '00000000-0000-0000-0000-000000000001';
  v_user2 UUID := '00000000-0000-0000-0000-000000000002';

  -- 口座ID
  v_acc_mizuho   UUID := uuid_generate_v4();
  v_acc_sbi_bank UUID := uuid_generate_v4();
  v_acc_rakuten  UUID := uuid_generate_v4();
  v_acc_sbi_sec  UUID := uuid_generate_v4();
  v_acc_credit   UUID := uuid_generate_v4();
  v_acc_smbc     UUID := uuid_generate_v4();

  -- カテゴリID（後で参照）
  v_cat_salary   UUID;
  v_cat_food     UUID;
  v_cat_housing  UUID;
  v_cat_transport UUID;
  v_cat_utility  UUID;
  v_cat_entertainment UUID;
  v_cat_subscription  UUID;

  -- ダミーの auth.users 行（テスト用）
BEGIN

  -- テスト用にauth.usersに行を挿入（ローカルSupabaseのみ）
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES
  (
    v_user1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'test@manefo.local',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"テスト 太郎"}',
    NOW(), NOW()
  ),
  (
    v_user2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin@manefo.local',
    crypt('Admin1234!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"管理者 花子"}',
    NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- profiles（トリガーで自動作成されるが念のため）
  INSERT INTO profiles (id, display_name) VALUES
  (v_user1, 'テスト太郎'),
  (v_user2, '管理者花子')
  ON CONFLICT (id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- 口座データ（ユーザー1）
  -- -------------------------------------------------------------------------
  INSERT INTO accounts (id, user_id, institution_id, name, official_name, account_type, asset_class, currency, balance, balance_updated_at, is_manual, display_order)
  VALUES
  (
    v_acc_mizuho, v_user1,
    (SELECT id FROM financial_institutions WHERE code = 'mizuho'),
    'みずほ銀行 普通', 'みずほ銀行 普通預金',
    'checking', 'asset', 'JPY', 4920000, NOW() - INTERVAL '2 hours', FALSE, 10
  ),
  (
    v_acc_sbi_bank, v_user1,
    (SELECT id FROM financial_institutions WHERE code = 'sbi_bank'),
    '住信SBIネット銀行', '住信SBIネット銀行 普通預金',
    'checking', 'asset', 'JPY', 1850000, NOW() - INTERVAL '1 hour', FALSE, 20
  ),
  (
    v_acc_rakuten, v_user1,
    (SELECT id FROM financial_institutions WHERE code = 'rakuten_bank'),
    '楽天銀行', '楽天銀行 普通預金',
    'checking', 'asset', 'JPY', 512040, NOW() - INTERVAL '1 day', FALSE, 30
  ),
  (
    v_acc_sbi_sec, v_user1,
    (SELECT id FROM financial_institutions WHERE code = 'sbi_sec'),
    'SBI証券', 'SBI証券 特定口座',
    'investment', 'asset', 'JPY', 8450300, NOW() - INTERVAL '3 hours', FALSE, 40
  ),
  (
    v_acc_credit, v_user1,
    (SELECT id FROM financial_institutions WHERE code = 'rakuten_card'),
    '楽天カード', '楽天カード',
    'credit_card', 'liability', 'JPY', -138200, NOW() - INTERVAL '6 hours', FALSE, 50
  ),
  (
    v_acc_smbc, v_user1,
    (SELECT id FROM financial_institutions WHERE code = 'smbc'),
    '三井住友銀行', '三井住友銀行 普通預金',
    'checking', 'asset', 'JPY', 320000, NOW() - INTERVAL '30 minutes', FALSE, 60
  );

  -- -------------------------------------------------------------------------
  -- カテゴリID取得
  -- -------------------------------------------------------------------------
  SELECT id INTO v_cat_salary FROM categories WHERE name = '給与・賞与' AND is_system = TRUE LIMIT 1;
  SELECT id INTO v_cat_food FROM categories WHERE name = '食費' AND is_system = TRUE LIMIT 1;
  SELECT id INTO v_cat_housing FROM categories WHERE name = '住居費' AND is_system = TRUE LIMIT 1;
  SELECT id INTO v_cat_transport FROM categories WHERE name = '交通費' AND is_system = TRUE LIMIT 1;
  SELECT id INTO v_cat_utility FROM categories WHERE name = '光熱費' AND is_system = TRUE LIMIT 1;
  SELECT id INTO v_cat_entertainment FROM categories WHERE name = '娯楽・趣味' AND is_system = TRUE LIMIT 1;
  SELECT id INTO v_cat_subscription FROM categories WHERE name = 'サブスク・月額' AND is_system = TRUE LIMIT 1;

  -- -------------------------------------------------------------------------
  -- 取引明細（直近12ヶ月分のダミーデータ）
  -- -------------------------------------------------------------------------

  -- 給与（月次）
  INSERT INTO transactions (user_id, account_id, transaction_type, amount, description, category_id, transacted_at, external_id)
  SELECT
    v_user1, v_acc_mizuho, 'income',
    CASE WHEN extract(month FROM d) IN (6, 12) THEN 650000 ELSE 450000 END,  -- ボーナス月
    '給与振込',
    v_cat_salary,
    d + TIME '09:30:00',
    'salary-' || to_char(d, 'YYYYMM')
  FROM generate_series(
    (NOW() - INTERVAL '11 months')::DATE,
    NOW()::DATE,
    INTERVAL '1 month'
  ) AS d(d)
  WHERE extract(day FROM d) = 1
  ON CONFLICT (account_id, external_id) DO NOTHING;

  -- 家賃（月次）
  INSERT INTO transactions (user_id, account_id, transaction_type, amount, description, category_id, transacted_at, external_id)
  SELECT
    v_user1, v_acc_mizuho, 'expense',
    -120000,
    '家賃 引落',
    v_cat_housing,
    d + TIME '08:00:00',
    'rent-' || to_char(d, 'YYYYMM')
  FROM generate_series(
    (NOW() - INTERVAL '11 months')::DATE,
    NOW()::DATE,
    INTERVAL '1 month'
  ) AS d(d)
  WHERE extract(day FROM d) = 1
  ON CONFLICT (account_id, external_id) DO NOTHING;

  -- 食費（週次 ランダム金額）
  INSERT INTO transactions (user_id, account_id, transaction_type, amount, description, category_id, transacted_at, external_id)
  SELECT
    v_user1,
    CASE WHEN random() > 0.5 THEN v_acc_credit ELSE v_acc_rakuten END,
    'expense',
    -(2000 + (random() * 8000)::INT),
    (ARRAY['スーパー三和', 'イオン', '成城石井', 'まいばすけっと', 'ライフ', 'ピーコック'])[floor(random() * 6 + 1)::INT],
    v_cat_food,
    d + (random() * INTERVAL '12 hours'),
    'food-' || to_char(d, 'YYYYMMDD') || '-' || floor(random() * 9999)::TEXT
  FROM generate_series(
    (NOW() - INTERVAL '11 months')::TIMESTAMPTZ,
    NOW(),
    INTERVAL '3 days'
  ) AS d(d)
  ON CONFLICT (account_id, external_id) DO NOTHING;

  -- 交通費（電車・タクシー）
  INSERT INTO transactions (user_id, account_id, transaction_type, amount, description, category_id, transacted_at, external_id)
  SELECT
    v_user1, v_acc_credit, 'expense',
    -(200 + (random() * 5000)::INT),
    (ARRAY['Suica チャージ', '東京メトロ', 'JR東日本', 'タクシー GO', 'バス'])[floor(random() * 5 + 1)::INT],
    v_cat_transport,
    d + (random() * INTERVAL '8 hours'),
    'transport-' || to_char(d, 'YYYYMMDD') || '-' || floor(random() * 9999)::TEXT
  FROM generate_series(
    (NOW() - INTERVAL '11 months')::TIMESTAMPTZ,
    NOW(),
    INTERVAL '2 days'
  ) AS d(d)
  ON CONFLICT (account_id, external_id) DO NOTHING;

  -- 光熱費（月次）
  INSERT INTO transactions (user_id, account_id, transaction_type, amount, description, category_id, transacted_at, external_id)
  SELECT
    v_user1, v_acc_mizuho, 'expense',
    -(5000 + (random() * 8000)::INT),
    (ARRAY['東京電力 電気料金', '東京ガス', '水道料金'])[floor(random() * 3 + 1)::INT],
    v_cat_utility,
    d + TIME '10:00:00',
    'utility-' || to_char(d, 'YYYYMM') || '-' || floor(random() * 3 + 1)::TEXT
  FROM generate_series(
    (NOW() - INTERVAL '11 months')::DATE,
    NOW()::DATE,
    INTERVAL '1 month'
  ) AS d(d)
  WHERE extract(day FROM d) = 1
  ON CONFLICT (account_id, external_id) DO NOTHING;

  -- サブスク（月次固定）
  INSERT INTO transactions (user_id, account_id, transaction_type, amount, description, category_id, transacted_at, external_id)
  SELECT
    v_user1, v_acc_credit, 'expense',
    amount,
    name,
    v_cat_subscription,
    d + TIME '00:01:00',
    'sub-' || REPLACE(LOWER(name), ' ', '-') || '-' || to_char(d, 'YYYYMM')
  FROM
    generate_series(
      (NOW() - INTERVAL '11 months')::DATE,
      NOW()::DATE,
      INTERVAL '1 month'
    ) AS d(d)
    CROSS JOIN (VALUES
      ('Netflix', -1490),
      ('Spotify プレミアム', -980),
      ('Amazon プライム', -600),
      ('ChatGPT Plus', -3000),
      ('iCloud+', -130)
    ) AS subs(name, amount)
  WHERE extract(day FROM d) = 1
  ON CONFLICT (account_id, external_id) DO NOTHING;

  -- 娯楽（ランダム）
  INSERT INTO transactions (user_id, account_id, transaction_type, amount, description, category_id, transacted_at, external_id)
  SELECT
    v_user1, v_acc_credit, 'expense',
    -(1000 + (random() * 15000)::INT),
    (ARRAY['映画館', 'ゲーム購入 Steam', 'Amazon.co.jp', 'ヨドバシカメラ', 'ビックカメラ', 'BookLive！'])[floor(random() * 6 + 1)::INT],
    v_cat_entertainment,
    d + (random() * INTERVAL '12 hours'),
    'entertainment-' || to_char(d, 'YYYYMMDD') || '-' || floor(random() * 9999)::TEXT
  FROM generate_series(
    (NOW() - INTERVAL '11 months')::TIMESTAMPTZ,
    NOW(),
    INTERVAL '8 days'
  ) AS d(d)
  ON CONFLICT (account_id, external_id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- 資産スナップショット（1年分・日次）
  -- -------------------------------------------------------------------------
  INSERT INTO asset_snapshots (user_id, account_id, snapshot_date, balance, currency)
  SELECT
    v_user1,
    account_id,
    d::DATE,
    base_balance + (random() * fluctuation - fluctuation / 2)::NUMERIC(20, 4),
    'JPY'
  FROM
    generate_series(
      (NOW() - INTERVAL '365 days')::DATE,
      NOW()::DATE,
      INTERVAL '1 day'
    ) AS d(d)
    CROSS JOIN (VALUES
      (v_acc_mizuho,   4920000, 200000),
      (v_acc_sbi_bank, 1850000, 100000),
      (v_acc_rakuten,   512040,  50000),
      (v_acc_sbi_sec,  8450300, 500000),
      (v_acc_credit,   -138200,  30000),
      (v_acc_smbc,      320000,  80000)
    ) AS accs(account_id, base_balance, fluctuation)
  ON CONFLICT (account_id, snapshot_date) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- 保有銘柄（SBI証券）
  -- -------------------------------------------------------------------------
  INSERT INTO investment_holdings (user_id, account_id, ticker, name, security_type, quantity, average_cost, current_price, currency)
  VALUES
  (v_user1, v_acc_sbi_sec, '7203.T', 'トヨタ自動車', 'stock_jp', 100, 2850.0, 3120.5, 'JPY'),
  (v_user1, v_acc_sbi_sec, '9984.T', 'ソフトバンクグループ', 'stock_jp', 50, 7200.0, 8540.0, 'JPY'),
  (v_user1, v_acc_sbi_sec, '8306.T', '三菱UFJフィナンシャル', 'stock_jp', 200, 980.0, 1243.5, 'JPY'),
  (v_user1, v_acc_sbi_sec, 'AAPL', 'Apple Inc.', 'stock_us', 10, 150.0, 189.5, 'USD'),
  (v_user1, v_acc_sbi_sec, 'MSFT', 'Microsoft Corp.', 'stock_us', 5, 320.0, 415.2, 'USD'),
  (v_user1, v_acc_sbi_sec, '03311187', 'eMAXIS Slim 全世界株式', 'mutual_fund', 1523.456, 12000.0, 25840.0, 'JPY'),
  (v_user1, v_acc_sbi_sec, '03319172', 'eMAXIS Slim 米国株式(S&P500)', 'mutual_fund', 890.123, 15000.0, 31200.0, 'JPY')
  ON CONFLICT (account_id, ticker) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- 予算（今月）
  -- -------------------------------------------------------------------------
  INSERT INTO budgets (user_id, category_id, budget_month, amount)
  VALUES
  (v_user1, v_cat_food, DATE_TRUNC('month', NOW())::DATE, 50000),
  (v_user1, v_cat_housing, DATE_TRUNC('month', NOW())::DATE, 120000),
  (v_user1, v_cat_transport, DATE_TRUNC('month', NOW())::DATE, 15000),
  (v_user1, v_cat_utility, DATE_TRUNC('month', NOW())::DATE, 20000),
  (v_user1, v_cat_entertainment, DATE_TRUNC('month', NOW())::DATE, 30000),
  (v_user1, v_cat_subscription, DATE_TRUNC('month', NOW())::DATE, 10000)
  ON CONFLICT (user_id, category_id, budget_month) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- 通知サンプル
  -- -------------------------------------------------------------------------
  INSERT INTO notifications (user_id, title, body, type, metadata)
  VALUES
  (v_user1, '口座同期が完了しました', 'みずほ銀行の同期が完了。取引5件を取得しました。', 'sync_complete', '{"account": "みずほ銀行"}'),
  (v_user1, '食費の予算80%に到達', '今月の食費が¥40,000 を超えました（予算: ¥50,000）', 'balance_alert', '{"category": "食費", "spent": 40000, "budget": 50000}'),
  (v_user1, '楽天証券の再ログインが必要です', '認証期限が切れています。口座設定から再連携してください。', 'sync_error', '{"account": "楽天証券"}');

END $$;

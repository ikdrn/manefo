# manefo — 個人資産管理アプリ

> Money Forward ME の完全上位互換を目指す、無料・無制限・広告なしの個人資産管理プラットフォーム。

## 差別化ポイント

| 機能 | マネーフォワード ME | **manefo** |
|---|---|---|
| 資産推移グラフ（全期間） | 有料(プレミアム) | **完全無料** |
| 資産内訳ツリーマップ | 有料 | **完全無料** |
| 負債推移グラフ | 有料 | **完全無料** |
| 家計レポート（月次/年次/前年比） | 有料 | **完全無料** |
| 連携口座数 | 無料4件 / 有料無制限 | **実質無制限（無料）** |
| 広告 | 無料プランは表示あり | **完全非表示** |
| データ閲覧期間制限 | 無料1年 | **制限なし・全期間** |

## 技術スタック

```
Frontend  : TypeScript + React (Next.js 15 App Router) → Vercel
Backend   : Rust (Axum) → Fly.io
Database  : Supabase (PostgreSQL 15)
Auth      : Supabase Auth (Email/Password + Google OAuth)
Storage   : Supabase Storage
Secrets   : Supabase Vault / AES-256-GCM
Charts    : Recharts
Icons     : Lucide React
Styling   : Tailwind CSS v4
```

## ディレクトリ構成

```
manefo/
├── README.md
├── .env.example
├── db/
│   ├── schema.sql          # 全テーブル定義・RLS・インデックス
│   └── seed.sql            # テストデータ挿入
├── frontend/               # Next.js 15 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx         # ホーム（資産サマリー）
│   │   │   │   ├── accounts/        # 口座一覧
│   │   │   │   ├── transactions/    # 取引明細
│   │   │   │   └── reports/         # 収支レポート
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                  # 汎用UIコンポーネント
│   │   │   ├── charts/              # グラフ系コンポーネント
│   │   │   ├── accounts/            # 口座関連
│   │   │   └── layout/              # ヘッダー・サイドバー等
│   │   ├── lib/
│   │   │   ├── supabase/            # Supabaseクライアント
│   │   │   └── utils/
│   │   └── types/                   # 共有型定義
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
└── backend/                # Rust / Axum
    ├── src/
    │   ├── main.rs
    │   ├── routes/
    │   │   ├── accounts.rs
    │   │   ├── transactions.rs
    │   │   ├── assets.rs
    │   │   └── providers.rs
    │   ├── models/
    │   ├── providers/               # AccountProvider trait + 実装
    │   │   ├── mod.rs               # trait定義
    │   │   ├── mizuho.rs
    │   │   ├── mufg.rs
    │   │   ├── smbc.rs
    │   │   ├── rakuten.rs
    │   │   └── sbi.rs
    │   ├── services/
    │   └── middleware/
    ├── Cargo.toml
    └── fly.toml
```

## ローカル開発手順

### 前提条件

- Node.js 22+
- Rust 1.80+（`rustup` 推奨）
- Supabase CLI（`brew install supabase/tap/supabase` または npm）
- Docker（Supabaseローカル起動に必要）

### 1. リポジトリのクローン

```bash
git clone <repo-url> manefo
cd manefo
```

### 2. Supabase ローカルセットアップ

```bash
# Supabase CLIの初期化（初回のみ）
supabase init

# ローカルSupabaseを起動（Docker必須）
supabase start

# マイグレーション実行
supabase db reset   # schema.sql + seed.sql を適用
```

起動後、以下が使えるようになります：
- API URL: `http://localhost:54321`
- Studio: `http://localhost:54323`
- DB: `postgresql://postgres:postgres@localhost:54322/postgres`

### 3. 環境変数の設定

```bash
# frontend
cp .env.example frontend/.env.local

# backend
cp .env.example backend/.env
```

`.env.local` / `.env` を編集してローカルSupabase URLを設定。

### 4. フロントエンド起動

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### 5. バックエンド起動

```bash
cd backend
cargo run
# → http://localhost:8080
```

## Vercel デプロイ手順（Frontend）

### 1. Vercelにプロジェクト作成

```bash
cd frontend
npx vercel
```

### 2. 環境変数を Vercel ダッシュボードに設定

| 変数名 | 説明 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public キー |
| `NEXT_PUBLIC_API_URL` | Rust バックエンドの URL（Fly.io） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role キー（サーバーサイドのみ） |

### 3. デプロイ

```bash
git push origin main  # GitHubと連携済みならプッシュでCD発火
```

## Fly.io デプロイ手順（Backend）

### 1. Fly CLI インストール

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. アプリ作成

```bash
cd backend
fly launch --name manefo-backend --region nrt  # 東京リージョン
```

### 3. シークレットを設定

```bash
fly secrets set \
  SUPABASE_URL="https://xxxx.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
  ENCRYPTION_KEY="<32バイトのランダム文字列>" \
  CORS_ORIGIN="https://manefo.vercel.app"
```

### 4. デプロイ

```bash
fly deploy
```

## 環境変数一覧

`.env.example` を参照。

---

## セキュリティ方針

- 口座認証情報は **Supabase Vault** または **AES-256-GCM** で暗号化保存
- 金融機関トークン・パスワードは絶対にクライアントに露出しない
- 全API呼び出しはSupabase JWTによる認証必須
- RLSポリシーにより、ユーザーは自分のデータのみ参照可能
- 全操作は `audit_logs` テーブルに記録

## ライセンス

MIT

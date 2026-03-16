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
Frontend + API  : TypeScript + React (Next.js 15 App Router)
                  → Vercel（フロントエンド・APIルート一括デプロイ）
Database        : Supabase (PostgreSQL 15)
Auth            : Supabase Auth (Email/Password + Google OAuth)
Storage         : Supabase Storage
暗号化          : Node.js AES-256-GCM (crypto モジュール)
Charts          : Recharts
Icons           : Lucide React
Styling         : Tailwind CSS v4
```

> **Vercel完結**: フロントエンドとAPIは同じNext.jsプロジェクト内。
> `frontend/src/app/api/` 以下が全バックエンドロジックを担う。
> 別サーバーは一切不要。

## アーキテクチャ概要

```
Vercel（Next.js 15）
├── app/                   # フロントエンド（React Server Components）
│   ├── (auth)/            # 認証ページ
│   └── (dashboard)/       # ダッシュボード・口座・取引・レポート
└── app/api/               # バックエンドAPI（Serverless Functions）
    ├── accounts/          # 口座 CRUD + 同期
    ├── transactions/      # 取引 CRUD
    ├── assets/            # 資産サマリー・推移履歴
    ├── holdings/          # 保有銘柄
    ├── reports/           # 月次・年次・カテゴリレポート
    └── providers/         # 対応金融機関一覧

Supabase
├── PostgreSQL             # データストア（RLS適用）
├── Auth                   # ユーザー認証（JWT）
└── Storage                # アバター等のファイル
```

## ディレクトリ構成

```
manefo/
├── README.md
├── .env.example
├── db/
│   ├── schema.sql          # 全テーブル定義・RLS・インデックス
│   └── seed.sql            # テストデータ挿入
├── supabase/               # Supabase CLIローカル設定
└── frontend/               # Next.js 15（フロント + API一体）
    └── src/
        ├── app/
        │   ├── (auth)/         # login / register
        │   ├── (dashboard)/    # ホーム・口座・取引・レポート
        │   ├── api/            # APIルートハンドラー（バックエンド）
        │   │   ├── accounts/
        │   │   ├── transactions/
        │   │   ├── assets/
        │   │   ├── holdings/
        │   │   ├── reports/
        │   │   └── providers/
        │   └── auth/callback/  # OAuth コールバック
        ├── components/
        │   ├── charts/         # AssetHistoryChart / AssetBreakdownChart
        │   ├── accounts/       # AccountCard
        │   └── layout/         # Header / Sidebar
        ├── lib/
        │   ├── supabase/       # client.ts / server.ts / admin.ts
        │   ├── providers/      # AccountProvider interface + 各行実装
        │   ├── auth.ts         # withAuth ミドルウェア
        │   └── crypto.ts       # AES-256-GCM 暗号化
        └── types/              # 共有型定義
```

## ローカル開発手順

### 前提条件

- Node.js 22+
- Supabase CLI（`npm install -g supabase` または Homebrew）
- Docker（Supabaseローカル起動に必要）

### 1. リポジトリのクローン

```bash
git clone <repo-url> manefo
cd manefo
```

### 2. Supabase ローカルセットアップ

```bash
supabase init       # 初回のみ（supabase/config.toml が既にあるのでスキップ可）
supabase start      # Docker でローカルSupabaseを起動

# スキーマ + テストデータを適用
supabase db reset
```

起動後:
- API URL: `http://localhost:54321`
- Studio: `http://localhost:54323`
- DB: `postgresql://postgres:postgres@localhost:54322/postgres`

### 3. 環境変数の設定

```bash
cp .env.example frontend/.env.local
# .env.local を編集してローカルSupabase URLを設定
```

### 4. 起動

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Vercel デプロイ手順

### 1. Vercel プロジェクト作成

```bash
cd frontend
npx vercel
# Root Directory: frontend（またはVercelダッシュボードで設定）
```

### 2. 環境変数を Vercel ダッシュボードに設定

| 変数名 | 説明 | 例 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon キー | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role キー（APIルート専用・非公開） | `eyJ...` |
| `ENCRYPTION_KEY` | 口座認証情報の暗号化キー（64文字hex） | `openssl rand -hex 32` で生成 |

> **注意**: `SUPABASE_SERVICE_ROLE_KEY` と `ENCRYPTION_KEY` は
> `NEXT_PUBLIC_` プレフィックスなし → クライアントに公開されない。

### 3. Supabase プロダクション設定

1. Supabase ダッシュボードで新プロジェクト作成
2. SQL Editor で `db/schema.sql` を実行
3. Authentication → URL Configuration に Vercel の URL を追加
   例: `https://manefo.vercel.app`
4. (オプション) Authentication → Providers → Google を有効化

### 4. デプロイ

```bash
git push origin main  # GitHub連携済みなら自動CD
# または
vercel --prod
```

---

## 環境変数一覧

`.env.example` を参照。

## セキュリティ方針

- 口座認証情報は **AES-256-GCM** で暗号化後にSupabaseへ保存
- `SUPABASE_SERVICE_ROLE_KEY` はAPIルート（サーバー）のみ使用。クライアントには絶対に露出しない
- 全テーブルに **RLS（Row Level Security）** を適用。ユーザーは自分のデータのみ参照可能
- `account_credentials` テーブルはfrontendのAnonキーからは一切読み取り不可（service_roleのみ）
- 全操作は `audit_logs` テーブルに記録
- CSP・X-Frame-Optionsなどセキュリティヘッダーを `next.config.ts` で設定済み

## ライセンス

MIT

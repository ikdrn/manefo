// =============================================================================
// AccountProvider trait
//
// 各金融機関の口座連携実装はこのtraitを実装する。
// プラグイン設計により、新しい金融機関の追加が容易。
//
// 実装方針:
//   - Playwrightベースのスクレイピング（ユーザー同意必須）
//   - 公式APIが提供されている場合はAPIを優先
//   - 認証情報はaccount_credentialsテーブルにAES-256-GCMで保存
// =============================================================================

use anyhow::Result;
use async_trait::async_trait;
use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// スクレイピングで取得した取引明細
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrapedTransaction {
    pub external_id: String,
    pub transacted_at: DateTime<Utc>,
    pub description: String,
    pub amount: Decimal,         // 正値=収入、負値=支出
    pub balance_after: Option<Decimal>,
    pub raw_data: Option<serde_json::Value>,
}

/// スクレイピングで取得した残高スナップショット
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrapedBalance {
    pub date: NaiveDate,
    pub balance: Decimal,
    pub currency: String,
}

/// 保有銘柄情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrapedHolding {
    pub ticker: String,
    pub name: String,
    pub security_type: String,
    pub quantity: Decimal,
    pub average_cost: Decimal,
    pub current_price: Option<Decimal>,
    pub currency: String,
}

/// 口座連携に必要な認証情報（暗号化前のプレーンテキスト）
/// 各プロバイダーが必要なフィールドを定義
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountCredentials {
    pub login_id: Option<String>,
    pub password: Option<String>,
    pub branch_code: Option<String>,  // 支店番号（みずほ等）
    pub account_number: Option<String>,
    pub totp_secret: Option<String>,  // TOTP/2FA（将来対応）
    pub extra: Option<serde_json::Value>,
}

/// 同期結果
#[derive(Debug)]
pub struct SyncResult {
    pub account_id: Uuid,
    pub current_balance: Decimal,
    pub transactions: Vec<ScrapedTransaction>,
    pub holdings: Vec<ScrapedHolding>,
    pub balance_history: Vec<ScrapedBalance>,
}

/// AccountProvider trait
/// 全金融機関の連携実装はこのtraitを実装する
#[async_trait]
pub trait AccountProvider: Send + Sync {
    /// プロバイダー識別コード（例: "mizuho", "sbi_sec"）
    fn provider_code(&self) -> &'static str;

    /// プロバイダー名（表示用）
    fn provider_name(&self) -> &'static str;

    /// 口座連携に必要なフィールドを返す（UI生成に使用）
    fn required_fields(&self) -> Vec<CredentialField>;

    /// 認証情報の検証（フォームバリデーション用）
    fn validate_credentials(&self, creds: &AccountCredentials) -> Result<()>;

    /// 口座情報・取引明細・残高を取得
    async fn sync(&self, account_id: Uuid, credentials: &AccountCredentials) -> Result<SyncResult>;
}

/// UI生成用: 認証フォームのフィールド定義
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialField {
    pub key: String,
    pub label: String,
    pub field_type: String,    // "text" | "password" | "number"
    pub required: bool,
    pub placeholder: Option<String>,
    pub help_text: Option<String>,
}

// ---------------------------------------------------------------------------
// プロバイダーレジストリ（利用可能なプロバイダーを登録・取得）
// ---------------------------------------------------------------------------

use std::collections::HashMap;
use std::sync::Arc;

pub struct ProviderRegistry {
    providers: HashMap<String, Arc<dyn AccountProvider>>,
}

impl ProviderRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            providers: HashMap::new(),
        };

        // プロバイダーを登録
        registry.register(Arc::new(mizuho::MizuhoProvider));
        registry.register(Arc::new(sbi_securities::SbiSecuritiesProvider));
        registry.register(Arc::new(rakuten_bank::RakutenBankProvider));
        registry.register(Arc::new(smbc::SmbcProvider));

        registry
    }

    pub fn register(&mut self, provider: Arc<dyn AccountProvider>) {
        self.providers.insert(provider.provider_code().to_string(), provider);
    }

    pub fn get(&self, code: &str) -> Option<Arc<dyn AccountProvider>> {
        self.providers.get(code).cloned()
    }

    pub fn list(&self) -> Vec<&str> {
        self.providers.keys().map(|k| k.as_str()).collect()
    }
}

// ---------------------------------------------------------------------------
// 各プロバイダー実装（サブモジュール）
// ---------------------------------------------------------------------------
pub mod mizuho;
pub mod rakuten_bank;
pub mod sbi_securities;
pub mod smbc;

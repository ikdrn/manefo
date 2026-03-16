// =============================================================================
// SBI証券 プロバイダー
//
// 実装メモ:
//   - SBI証券 (https://www.sbisec.co.jp/) をスクレイピング
//   - ログインに: ユーザーネーム + ログインパスワード
//   - 取得項目: 保有株式・投信・評価損益・取引履歴
//   - TODO: Playwright実装（ログイン後SPA）
// =============================================================================

use anyhow::{anyhow, Result};
use async_trait::async_trait;
use uuid::Uuid;

use super::{AccountCredentials, AccountProvider, CredentialField, SyncResult};

pub struct SbiSecuritiesProvider;

#[async_trait]
impl AccountProvider for SbiSecuritiesProvider {
    fn provider_code(&self) -> &'static str {
        "sbi_sec"
    }

    fn provider_name(&self) -> &'static str {
        "SBI証券"
    }

    fn required_fields(&self) -> Vec<CredentialField> {
        vec![
            CredentialField {
                key: "login_id".to_string(),
                label: "ユーザーネーム".to_string(),
                field_type: "text".to_string(),
                required: true,
                placeholder: Some("SBI証券に登録したユーザーネーム".to_string()),
                help_text: None,
            },
            CredentialField {
                key: "password".to_string(),
                label: "ログインパスワード".to_string(),
                field_type: "password".to_string(),
                required: true,
                placeholder: None,
                help_text: None,
            },
        ]
    }

    fn validate_credentials(&self, creds: &AccountCredentials) -> Result<()> {
        if creds.login_id.as_deref().unwrap_or("").is_empty() {
            return Err(anyhow!("ユーザーネームを入力してください"));
        }
        if creds.password.as_deref().unwrap_or("").is_empty() {
            return Err(anyhow!("パスワードを入力してください"));
        }
        Ok(())
    }

    async fn sync(&self, account_id: Uuid, credentials: &AccountCredentials) -> Result<SyncResult> {
        // TODO: 実装予定
        // 1. POST https://www.sbisec.co.jp/ETGate/?OutSide=on&... でログイン
        // 2. 保有株式ページ /ETGate/?OutSide=on&_ControlID=WPLETpoM001Control&...
        // 3. 投信残高ページ取得
        // 4. 取引履歴ページ取得
        // 5. scraper クレートでHTML解析

        tracing::info!("SbiSecuritiesProvider::sync called for account {}", account_id);

        Err(anyhow!(
            "SBI証券の自動取得は実装中です。手動入力をご利用ください。"
        ))
    }
}

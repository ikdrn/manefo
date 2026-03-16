// =============================================================================
// みずほ銀行 プロバイダー
//
// 実装メモ:
//   - みずほダイレクト (https://web.ib.mizuhobank.co.jp/) をスクレイピング
//   - ログインに: 店番号 + 口座番号 + ログインパスワード
//   - 要: reqwestによるセッション管理 + HTML解析
//   - TODO: Playwrightによる実装（JavaScriptレンダリング必須）
// =============================================================================

use anyhow::{anyhow, Result};
use async_trait::async_trait;
use uuid::Uuid;

use super::{AccountCredentials, AccountProvider, CredentialField, SyncResult};

pub struct MizuhoProvider;

#[async_trait]
impl AccountProvider for MizuhoProvider {
    fn provider_code(&self) -> &'static str {
        "mizuho"
    }

    fn provider_name(&self) -> &'static str {
        "みずほ銀行"
    }

    fn required_fields(&self) -> Vec<CredentialField> {
        vec![
            CredentialField {
                key: "branch_code".to_string(),
                label: "店番号".to_string(),
                field_type: "number".to_string(),
                required: true,
                placeholder: Some("000".to_string()),
                help_text: Some("3桁の店番号".to_string()),
            },
            CredentialField {
                key: "account_number".to_string(),
                label: "口座番号".to_string(),
                field_type: "number".to_string(),
                required: true,
                placeholder: Some("0000000".to_string()),
                help_text: Some("7桁の口座番号".to_string()),
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
        let branch = creds.branch_code.as_deref().unwrap_or("");
        let account = creds.account_number.as_deref().unwrap_or("");
        let password = creds.password.as_deref().unwrap_or("");

        if branch.len() != 3 {
            return Err(anyhow!("店番号は3桁で入力してください"));
        }
        if account.len() != 7 {
            return Err(anyhow!("口座番号は7桁で入力してください"));
        }
        if password.is_empty() {
            return Err(anyhow!("パスワードを入力してください"));
        }

        Ok(())
    }

    async fn sync(&self, account_id: Uuid, credentials: &AccountCredentials) -> Result<SyncResult> {
        // TODO: Playwright/puppeteerを使った実際のスクレイピング実装
        //
        // 実装手順:
        // 1. reqwest::Client でセッション開始
        // 2. ログインページ取得 → CSRF tokenを取得
        // 3. POST /login with branch_code + account_number + password
        // 4. ログイン成功確認
        // 5. /balance ページをスクレイピング → 残高取得
        // 6. /history ページをスクレイピング → 取引履歴取得
        // 7. ログアウト
        //
        // JavaScript必須のため、実際には:
        //   - headless browser (chromium経由) を起動
        //   - playwright-rust クレートを使用
        //   or
        //   - Node.js subprocess として playwright を呼び出す

        tracing::info!("MizuhoProvider::sync called for account {}", account_id);

        Err(anyhow!(
            "みずほ銀行の自動取得は実装中です。手動入力をご利用ください。"
        ))
    }
}

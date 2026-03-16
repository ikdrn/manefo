use anyhow::{anyhow, Result};
use async_trait::async_trait;
use uuid::Uuid;

use super::{AccountCredentials, AccountProvider, CredentialField, SyncResult};

pub struct RakutenBankProvider;

#[async_trait]
impl AccountProvider for RakutenBankProvider {
    fn provider_code(&self) -> &'static str {
        "rakuten_bank"
    }

    fn provider_name(&self) -> &'static str {
        "楽天銀行"
    }

    fn required_fields(&self) -> Vec<CredentialField> {
        vec![
            CredentialField {
                key: "login_id".to_string(),
                label: "ユーザーID".to_string(),
                field_type: "text".to_string(),
                required: true,
                placeholder: Some("楽天銀行のユーザーID".to_string()),
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
            return Err(anyhow!("ユーザーIDを入力してください"));
        }
        if creds.password.as_deref().unwrap_or("").is_empty() {
            return Err(anyhow!("パスワードを入力してください"));
        }
        Ok(())
    }

    async fn sync(&self, account_id: Uuid, _credentials: &AccountCredentials) -> Result<SyncResult> {
        tracing::info!("RakutenBankProvider::sync called for account {}", account_id);
        Err(anyhow!("楽天銀行の自動取得は実装中です。"))
    }
}

use anyhow::{anyhow, Result};
use async_trait::async_trait;
use uuid::Uuid;

use super::{AccountCredentials, AccountProvider, CredentialField, SyncResult};

pub struct SmbcProvider;

#[async_trait]
impl AccountProvider for SmbcProvider {
    fn provider_code(&self) -> &'static str {
        "smbc"
    }

    fn provider_name(&self) -> &'static str {
        "三井住友銀行"
    }

    fn required_fields(&self) -> Vec<CredentialField> {
        vec![
            CredentialField {
                key: "account_number".to_string(),
                label: "口座番号".to_string(),
                field_type: "text".to_string(),
                required: true,
                placeholder: Some("支店コード + 口座番号".to_string()),
                help_text: Some("SMBCダイレクトの口座番号".to_string()),
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
        if creds.account_number.as_deref().unwrap_or("").is_empty() {
            return Err(anyhow!("口座番号を入力してください"));
        }
        if creds.password.as_deref().unwrap_or("").is_empty() {
            return Err(anyhow!("パスワードを入力してください"));
        }
        Ok(())
    }

    async fn sync(&self, account_id: Uuid, _credentials: &AccountCredentials) -> Result<SyncResult> {
        tracing::info!("SmbcProvider::sync called for account {}", account_id);
        Err(anyhow!("三井住友銀行の自動取得は実装中です。"))
    }
}

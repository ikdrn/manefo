use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Account {
    pub id: Uuid,
    pub user_id: Uuid,
    pub institution_id: Option<Uuid>,
    pub name: String,
    pub official_name: Option<String>,
    pub account_type: String,
    pub asset_class: String,
    pub currency: String,
    pub balance: Decimal,
    pub balance_updated_at: Option<DateTime<Utc>>,
    pub is_manual: bool,
    pub is_hidden: bool,
    pub display_order: i32,
    pub icon_color: Option<String>,
    pub memo: Option<String>,
    pub provider_status: Option<String>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub sync_error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAccountRequest {
    pub institution_id: Option<Uuid>,
    pub name: String,
    pub account_type: String,
    pub asset_class: String,
    pub currency: Option<String>,
    pub balance: Option<Decimal>,
    pub is_manual: Option<bool>,
    pub display_order: Option<i32>,
    pub icon_color: Option<String>,
    pub memo: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAccountRequest {
    pub name: Option<String>,
    pub balance: Option<Decimal>,
    pub is_hidden: Option<bool>,
    pub display_order: Option<i32>,
    pub icon_color: Option<String>,
    pub memo: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AccountSummary {
    pub total_assets: Decimal,
    pub total_liabilities: Decimal,
    pub net_worth: Decimal,
    pub account_count: i64,
}

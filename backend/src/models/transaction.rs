use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Transaction {
    pub id: Uuid,
    pub user_id: Uuid,
    pub account_id: Uuid,
    pub transfer_pair_id: Option<Uuid>,
    pub transaction_type: String,
    pub amount: Decimal,
    pub currency: String,
    pub balance_after: Option<Decimal>,
    pub description: String,
    pub memo: Option<String>,
    pub category_id: Option<Uuid>,
    pub sub_category_id: Option<Uuid>,
    pub transacted_at: DateTime<Utc>,
    pub is_manual: bool,
    pub external_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTransactionRequest {
    pub account_id: Uuid,
    pub transaction_type: String,
    pub amount: Decimal,
    pub currency: Option<String>,
    pub description: String,
    pub memo: Option<String>,
    pub category_id: Option<Uuid>,
    pub transacted_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTransactionRequest {
    pub description: Option<String>,
    pub memo: Option<String>,
    pub category_id: Option<Uuid>,
    pub sub_category_id: Option<Uuid>,
    pub transacted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct TransactionListQuery {
    pub account_id: Option<Uuid>,
    pub category_id: Option<Uuid>,
    pub transaction_type: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

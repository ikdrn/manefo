use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AssetSnapshot {
    pub id: Uuid,
    pub user_id: Uuid,
    pub account_id: Uuid,
    pub snapshot_date: NaiveDate,
    pub balance: Decimal,
    pub currency: String,
    pub jpy_rate: Decimal,
    pub balance_jpy: Decimal,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InvestmentHolding {
    pub id: Uuid,
    pub user_id: Uuid,
    pub account_id: Uuid,
    pub ticker: String,
    pub name: String,
    pub security_type: String,
    pub quantity: Decimal,
    pub average_cost: Decimal,
    pub current_price: Option<Decimal>,
    pub current_value: Option<Decimal>,
    pub unrealized_pnl: Option<Decimal>,
    pub unrealized_pnl_pct: Option<Decimal>,
    pub currency: String,
    pub price_updated_at: Option<DateTime<Utc>>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssetHistoryPoint {
    pub date: String,  // YYYY-MM-DD
    pub total_assets: Decimal,
    pub total_liabilities: Decimal,
    pub net_worth: Decimal,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssetSummaryResponse {
    pub total_assets: Decimal,
    pub total_liabilities: Decimal,
    pub net_worth: Decimal,
    pub daily_change: Option<Decimal>,
    pub daily_change_pct: Option<Decimal>,
    pub monthly_change: Option<Decimal>,
    pub monthly_change_pct: Option<Decimal>,
    pub as_of: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AssetHistoryQuery {
    /// 1w | 1m | 3m | 6m | 1y | 3y | 5y | all
    pub range: Option<String>,
}

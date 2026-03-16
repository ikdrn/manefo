use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Category {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub parent_id: Option<Uuid>,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub category_type: String,
    pub is_system: bool,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

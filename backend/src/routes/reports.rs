use axum::{
    extract::{Extension, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::{middleware::auth::AuthUser, AppState};

#[derive(Debug, Deserialize)]
pub struct ReportQuery {
    pub year: Option<i32>,
    pub month: Option<i32>,
}

/// GET /api/v1/reports/monthly
/// 月次収支（全期間・無制限）
pub async fn monthly_report(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
    Query(q): Query<ReportQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let rows = sqlx::query!(
        r#"
        SELECT
          TO_CHAR(DATE_TRUNC('month', transacted_at), 'YYYY-MM') AS "month!",
          SUM(CASE WHEN transaction_type = 'income'  THEN ABS(amount) ELSE 0 END) AS "total_income!: rust_decimal::Decimal",
          SUM(CASE WHEN transaction_type = 'expense' THEN ABS(amount) ELSE 0 END) AS "total_expense!: rust_decimal::Decimal",
          COUNT(*) AS "count!: i64"
        FROM transactions
        WHERE user_id = $1 AND is_transfer = FALSE
        GROUP BY DATE_TRUNC('month', transacted_at)
        ORDER BY DATE_TRUNC('month', transacted_at) ASC
        "#,
        user.user_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(internal_error)?;

    let data: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| {
            let net = r.total_income - r.total_expense;
            serde_json::json!({
                "month": r.month,
                "total_income": r.total_income,
                "total_expense": r.total_expense,
                "net": net,
                "transaction_count": r.count,
            })
        })
        .collect();

    Ok(Json(serde_json::json!({ "data": data })))
}

/// GET /api/v1/reports/categories
/// カテゴリ別支出集計
pub async fn category_report(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
    Query(q): Query<ReportQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let year = q.year.unwrap_or(chrono::Utc::now().format("%Y").to_string().parse().unwrap_or(2025));
    let month = q.month.unwrap_or(chrono::Utc::now().format("%m").to_string().parse().unwrap_or(1));

    let rows = sqlx::query!(
        r#"
        SELECT
          c.id AS "category_id: uuid::Uuid",
          COALESCE(c.name, '未分類') AS "category_name!",
          c.icon AS category_icon,
          c.color AS category_color,
          t.transaction_type AS "transaction_type!",
          SUM(ABS(t.amount)) AS "total_amount!: rust_decimal::Decimal",
          COUNT(*) AS "transaction_count!: i64"
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1
          AND t.is_transfer = FALSE
          AND EXTRACT(YEAR  FROM t.transacted_at) = $2
          AND EXTRACT(MONTH FROM t.transacted_at) = $3
        GROUP BY c.id, c.name, c.icon, c.color, t.transaction_type
        ORDER BY SUM(ABS(t.amount)) DESC
        "#,
        user.user_id,
        year as f64,
        month as f64,
    )
    .fetch_all(&state.db)
    .await
    .map_err(internal_error)?;

    // 全体支出合計（パーセント計算用）
    let total_expense: rust_decimal::Decimal = rows
        .iter()
        .filter(|r| r.transaction_type == "expense")
        .map(|r| r.total_amount)
        .sum();

    let data: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| {
            let pct = if r.transaction_type == "expense" && !total_expense.is_zero() {
                Some(r.total_amount / total_expense * rust_decimal::Decimal::ONE_HUNDRED)
            } else {
                None
            };
            serde_json::json!({
                "category_id": r.category_id,
                "category_name": r.category_name,
                "category_icon": r.category_icon,
                "category_color": r.category_color,
                "transaction_type": r.transaction_type,
                "total_amount": r.total_amount,
                "transaction_count": r.transaction_count,
                "percentage": pct,
            })
        })
        .collect();

    Ok(Json(serde_json::json!({
        "year": year,
        "month": month,
        "total_expense": total_expense,
        "data": data,
    })))
}

/// GET /api/v1/reports/yearly
/// 年次サマリー
pub async fn yearly_report(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
    Query(q): Query<ReportQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let year = q.year.unwrap_or(chrono::Utc::now().format("%Y").to_string().parse().unwrap_or(2025));

    let row = sqlx::query!(
        r#"
        SELECT
          SUM(CASE WHEN transaction_type = 'income'  THEN ABS(amount) ELSE 0 END) AS "total_income!: rust_decimal::Decimal",
          SUM(CASE WHEN transaction_type = 'expense' THEN ABS(amount) ELSE 0 END) AS "total_expense!: rust_decimal::Decimal",
          COUNT(*) AS "count!: i64"
        FROM transactions
        WHERE user_id = $1
          AND is_transfer = FALSE
          AND EXTRACT(YEAR FROM transacted_at) = $2
        "#,
        user.user_id,
        year as f64,
    )
    .fetch_one(&state.db)
    .await
    .map_err(internal_error)?;

    let net = row.total_income - row.total_expense;

    Ok(Json(serde_json::json!({
        "year": year,
        "total_income": row.total_income,
        "total_expense": row.total_expense,
        "net": net,
        "transaction_count": row.count,
    })))
}

fn internal_error(e: sqlx::Error) -> (StatusCode, Json<serde_json::Value>) {
    tracing::error!("Database error: {}", e);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({ "error": "Internal server error" })),
    )
}

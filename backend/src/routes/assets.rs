use axum::{
    extract::{Extension, Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use std::sync::Arc;

use crate::{
    middleware::auth::AuthUser,
    models::asset::{
        AssetHistoryPoint, AssetHistoryQuery, AssetSummaryResponse, InvestmentHolding,
    },
    AppState,
};

/// GET /api/v1/assets/summary
/// 総資産・負債・純資産・前日比・前月比
pub async fn get_asset_summary(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
) -> Result<Json<AssetSummaryResponse>, (StatusCode, Json<serde_json::Value>)> {
    // 現在の純資産
    let row = sqlx::query!(
        r#"
        SELECT
          SUM(CASE WHEN asset_class = 'asset' THEN balance ELSE 0 END) AS total_assets,
          SUM(CASE WHEN asset_class = 'liability' THEN ABS(balance) ELSE 0 END) AS total_liabilities
        FROM accounts
        WHERE user_id = $1 AND is_hidden = FALSE
        "#,
        user.user_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(internal_error)?;

    let total_assets = row.total_assets.unwrap_or_default();
    let total_liabilities = row.total_liabilities.unwrap_or_default();
    let net_worth = total_assets - total_liabilities;

    // 前日スナップショット
    let yesterday_row = sqlx::query!(
        r#"
        SELECT
          SUM(CASE WHEN a.asset_class = 'asset' THEN s.balance_jpy ELSE 0 END) AS total_assets,
          SUM(CASE WHEN a.asset_class = 'liability' THEN ABS(s.balance_jpy) ELSE 0 END) AS total_liabilities
        FROM asset_snapshots s
        JOIN accounts a ON s.account_id = a.id
        WHERE s.user_id = $1
          AND s.snapshot_date = CURRENT_DATE - INTERVAL '1 day'
        "#,
        user.user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(internal_error)?;

    let (daily_change, daily_change_pct) = if let Some(y) = yesterday_row {
        let y_net = y.total_assets.unwrap_or_default() - y.total_liabilities.unwrap_or_default();
        let change = net_worth - y_net;
        let pct = if y_net != rust_decimal::Decimal::ZERO {
            Some(change / y_net)
        } else {
            None
        };
        (Some(change), pct)
    } else {
        (None, None)
    };

    // 前月スナップショット
    let last_month_row = sqlx::query!(
        r#"
        SELECT
          SUM(CASE WHEN a.asset_class = 'asset' THEN s.balance_jpy ELSE 0 END) AS total_assets,
          SUM(CASE WHEN a.asset_class = 'liability' THEN ABS(s.balance_jpy) ELSE 0 END) AS total_liabilities
        FROM asset_snapshots s
        JOIN accounts a ON s.account_id = a.id
        WHERE s.user_id = $1
          AND s.snapshot_date = DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day'
        "#,
        user.user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(internal_error)?;

    let (monthly_change, monthly_change_pct) = if let Some(m) = last_month_row {
        let m_net = m.total_assets.unwrap_or_default() - m.total_liabilities.unwrap_or_default();
        let change = net_worth - m_net;
        let pct = if m_net != rust_decimal::Decimal::ZERO {
            Some(change / m_net)
        } else {
            None
        };
        (Some(change), pct)
    } else {
        (None, None)
    };

    Ok(Json(AssetSummaryResponse {
        total_assets,
        total_liabilities,
        net_worth,
        daily_change,
        daily_change_pct,
        monthly_change,
        monthly_change_pct,
        as_of: Utc::now(),
    }))
}

/// GET /api/v1/assets/history?range=1y
/// 資産推移（全期間・無制限）
pub async fn get_asset_history(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
    Query(query): Query<AssetHistoryQuery>,
) -> Result<Json<Vec<AssetHistoryPoint>>, (StatusCode, Json<serde_json::Value>)> {
    let days: i64 = match query.range.as_deref().unwrap_or("all") {
        "1w"  => 7,
        "1m"  => 30,
        "3m"  => 90,
        "6m"  => 180,
        "1y"  => 365,
        "3y"  => 1095,
        "5y"  => 1825,
        _     => i64::MAX,  // "all" = 全期間
    };

    let cutoff_clause = if days == i64::MAX {
        "TRUE".to_string()
    } else {
        format!("s.snapshot_date >= CURRENT_DATE - INTERVAL '{} days'", days)
    };

    let rows = sqlx::query!(
        r#"
        SELECT
          s.snapshot_date::TEXT AS "date!",
          SUM(CASE WHEN a.asset_class = 'asset'    THEN s.balance_jpy ELSE 0 END) AS "total_assets!: rust_decimal::Decimal",
          SUM(CASE WHEN a.asset_class = 'liability' THEN ABS(s.balance_jpy) ELSE 0 END) AS "total_liabilities!: rust_decimal::Decimal"
        FROM asset_snapshots s
        JOIN accounts a ON s.account_id = a.id
        WHERE s.user_id = $1
        GROUP BY s.snapshot_date
        ORDER BY s.snapshot_date ASC
        "#,
        user.user_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(internal_error)?;

    let history: Vec<AssetHistoryPoint> = rows
        .into_iter()
        .map(|r| {
            let net = r.total_assets - r.total_liabilities;
            AssetHistoryPoint {
                date: r.date,
                total_assets: r.total_assets,
                total_liabilities: r.total_liabilities,
                net_worth: net,
            }
        })
        .collect();

    Ok(Json(history))
}

/// GET /api/v1/holdings
pub async fn list_holdings(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
) -> Result<Json<Vec<InvestmentHolding>>, (StatusCode, Json<serde_json::Value>)> {
    let holdings = sqlx::query_as::<_, InvestmentHolding>(
        "SELECT * FROM investment_holdings WHERE user_id = $1 ORDER BY current_value DESC NULLS LAST",
    )
    .bind(user.user_id)
    .fetch_all(&state.db)
    .await
    .map_err(internal_error)?;

    Ok(Json(holdings))
}

fn internal_error(e: sqlx::Error) -> (StatusCode, Json<serde_json::Value>) {
    tracing::error!("Database error: {}", e);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({ "error": "Internal server error" })),
    )
}

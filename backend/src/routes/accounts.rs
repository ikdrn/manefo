use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    middleware::auth::AuthUser,
    models::account::{Account, AccountSummary, CreateAccountRequest, UpdateAccountRequest},
    AppState,
};

/// GET /api/v1/accounts
pub async fn list_accounts(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
) -> Result<Json<Vec<Account>>, (StatusCode, Json<serde_json::Value>)> {
    let accounts = sqlx::query_as::<_, Account>(
        r#"
        SELECT * FROM accounts
        WHERE user_id = $1 AND is_hidden = FALSE
        ORDER BY display_order ASC, created_at ASC
        "#,
    )
    .bind(user.user_id)
    .fetch_all(&state.db)
    .await
    .map_err(internal_error)?;

    Ok(Json(accounts))
}

/// GET /api/v1/accounts/:id
pub async fn get_account(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<Account>, (StatusCode, Json<serde_json::Value>)> {
    let account = sqlx::query_as::<_, Account>(
        "SELECT * FROM accounts WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user.user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(internal_error)?
    .ok_or_else(|| not_found("Account not found"))?;

    Ok(Json(account))
}

/// POST /api/v1/accounts
pub async fn create_account(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
    Json(body): Json<CreateAccountRequest>,
) -> Result<(StatusCode, Json<Account>), (StatusCode, Json<serde_json::Value>)> {
    let account = sqlx::query_as::<_, Account>(
        r#"
        INSERT INTO accounts (
            user_id, institution_id, name, account_type, asset_class,
            currency, balance, is_manual, display_order, icon_color, memo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        "#,
    )
    .bind(user.user_id)
    .bind(body.institution_id)
    .bind(&body.name)
    .bind(&body.account_type)
    .bind(&body.asset_class)
    .bind(body.currency.as_deref().unwrap_or("JPY"))
    .bind(body.balance.unwrap_or_default())
    .bind(body.is_manual.unwrap_or(true))
    .bind(body.display_order.unwrap_or(100))
    .bind(&body.icon_color)
    .bind(&body.memo)
    .fetch_one(&state.db)
    .await
    .map_err(internal_error)?;

    Ok((StatusCode::CREATED, Json(account)))
}

/// PATCH /api/v1/accounts/:id
pub async fn update_account(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateAccountRequest>,
) -> Result<Json<Account>, (StatusCode, Json<serde_json::Value>)> {
    let account = sqlx::query_as::<_, Account>(
        r#"
        UPDATE accounts SET
            name           = COALESCE($3, name),
            balance        = COALESCE($4, balance),
            is_hidden      = COALESCE($5, is_hidden),
            display_order  = COALESCE($6, display_order),
            icon_color     = COALESCE($7, icon_color),
            memo           = COALESCE($8, memo)
        WHERE id = $1 AND user_id = $2
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(user.user_id)
    .bind(&body.name)
    .bind(body.balance)
    .bind(body.is_hidden)
    .bind(body.display_order)
    .bind(&body.icon_color)
    .bind(&body.memo)
    .fetch_optional(&state.db)
    .await
    .map_err(internal_error)?
    .ok_or_else(|| not_found("Account not found"))?;

    Ok(Json(account))
}

/// DELETE /api/v1/accounts/:id
pub async fn delete_account(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, Json<serde_json::Value>)> {
    let result = sqlx::query(
        "DELETE FROM accounts WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user.user_id)
    .execute(&state.db)
    .await
    .map_err(internal_error)?;

    if result.rows_affected() == 0 {
        return Err(not_found("Account not found"));
    }

    Ok(StatusCode::NO_CONTENT)
}

/// POST /api/v1/accounts/:id/sync
/// 口座の同期ジョブをキューに追加
pub async fn sync_account(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    // 口座の存在確認
    let account = sqlx::query_as::<_, Account>(
        "SELECT * FROM accounts WHERE id = $1 AND user_id = $2 AND is_manual = FALSE",
    )
    .bind(id)
    .bind(user.user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(internal_error)?
    .ok_or_else(|| not_found("Account not found or is manual"))?;

    // 同期ジョブ作成
    let job_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO sync_jobs (user_id, account_id, status)
        VALUES ($1, $2, 'pending')
        RETURNING id
        "#,
    )
    .bind(user.user_id)
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(internal_error)?;

    // TODO: 実際のスクレイピングはバックグラウンドタスクで実行
    // tokio::spawn(async move { providers::sync(account, state).await });

    Ok(Json(serde_json::json!({
        "job_id": job_id,
        "account_id": id,
        "status": "pending",
        "message": "Sync job queued"
    })))
}

// ---------------------------------------------------------------------------
// エラーヘルパー
// ---------------------------------------------------------------------------
fn internal_error(e: sqlx::Error) -> (StatusCode, Json<serde_json::Value>) {
    tracing::error!("Database error: {}", e);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({ "error": "Internal server error" })),
    )
}

fn not_found(msg: &str) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::NOT_FOUND,
        Json(serde_json::json!({ "error": msg })),
    )
}

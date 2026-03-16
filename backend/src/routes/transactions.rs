use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    middleware::auth::AuthUser,
    models::transaction::{
        CreateTransactionRequest, Transaction, TransactionListQuery, UpdateTransactionRequest,
    },
    AppState,
};

/// GET /api/v1/transactions
pub async fn list_transactions(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
    Query(q): Query<TransactionListQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let page = q.page.unwrap_or(1).max(1);
    let per_page = q.per_page.unwrap_or(50).min(200);
    let offset = (page - 1) * per_page;

    // 合計件数
    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM transactions
        WHERE user_id = $1
          AND ($2::UUID IS NULL OR account_id = $2)
          AND ($3::UUID IS NULL OR category_id = $3)
          AND ($4::TEXT IS NULL OR transaction_type = $4)
          AND ($5::DATE IS NULL OR transacted_at::DATE >= $5::DATE)
          AND ($6::DATE IS NULL OR transacted_at::DATE <= $6::DATE)
          AND ($7::TEXT IS NULL OR description ILIKE '%' || $7 || '%')
        "#,
    )
    .bind(user.user_id)
    .bind(q.account_id)
    .bind(q.category_id)
    .bind(&q.transaction_type)
    .bind(q.date_from.as_deref())
    .bind(q.date_to.as_deref())
    .bind(q.search.as_deref())
    .fetch_one(&state.db)
    .await
    .map_err(internal_error)?;

    let transactions = sqlx::query_as::<_, Transaction>(
        r#"
        SELECT t.* FROM transactions t
        WHERE t.user_id = $1
          AND ($2::UUID IS NULL OR t.account_id = $2)
          AND ($3::UUID IS NULL OR t.category_id = $3)
          AND ($4::TEXT IS NULL OR t.transaction_type = $4)
          AND ($5::DATE IS NULL OR t.transacted_at::DATE >= $5::DATE)
          AND ($6::DATE IS NULL OR t.transacted_at::DATE <= $6::DATE)
          AND ($7::TEXT IS NULL OR t.description ILIKE '%' || $7 || '%')
        ORDER BY t.transacted_at DESC
        LIMIT $8 OFFSET $9
        "#,
    )
    .bind(user.user_id)
    .bind(q.account_id)
    .bind(q.category_id)
    .bind(&q.transaction_type)
    .bind(q.date_from.as_deref())
    .bind(q.date_to.as_deref())
    .bind(q.search.as_deref())
    .bind(per_page)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(internal_error)?;

    let total_pages = (total + per_page - 1) / per_page;

    Ok(Json(serde_json::json!({
        "data": transactions,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    })))
}

/// POST /api/v1/transactions
pub async fn create_transaction(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
    Json(body): Json<CreateTransactionRequest>,
) -> Result<(StatusCode, Json<Transaction>), (StatusCode, Json<serde_json::Value>)> {
    // 口座の所有確認
    let account_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM accounts WHERE id = $1 AND user_id = $2)",
    )
    .bind(body.account_id)
    .bind(user.user_id)
    .fetch_one(&state.db)
    .await
    .map_err(internal_error)?;

    if !account_exists {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Account not found" })),
        ));
    }

    let transaction = sqlx::query_as::<_, Transaction>(
        r#"
        INSERT INTO transactions (
            user_id, account_id, transaction_type, amount, currency,
            description, memo, category_id, transacted_at, is_manual
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
        RETURNING *
        "#,
    )
    .bind(user.user_id)
    .bind(body.account_id)
    .bind(&body.transaction_type)
    .bind(body.amount)
    .bind(body.currency.as_deref().unwrap_or("JPY"))
    .bind(&body.description)
    .bind(&body.memo)
    .bind(body.category_id)
    .bind(body.transacted_at)
    .fetch_one(&state.db)
    .await
    .map_err(internal_error)?;

    Ok((StatusCode::CREATED, Json(transaction)))
}

/// PATCH /api/v1/transactions/:id
pub async fn update_transaction(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateTransactionRequest>,
) -> Result<Json<Transaction>, (StatusCode, Json<serde_json::Value>)> {
    let transaction = sqlx::query_as::<_, Transaction>(
        r#"
        UPDATE transactions SET
            description    = COALESCE($3, description),
            memo           = COALESCE($4, memo),
            category_id    = COALESCE($5, category_id),
            sub_category_id = COALESCE($6, sub_category_id),
            transacted_at  = COALESCE($7, transacted_at)
        WHERE id = $1 AND user_id = $2
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(user.user_id)
    .bind(&body.description)
    .bind(&body.memo)
    .bind(body.category_id)
    .bind(body.sub_category_id)
    .bind(body.transacted_at)
    .fetch_optional(&state.db)
    .await
    .map_err(internal_error)?
    .ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Transaction not found" })),
        )
    })?;

    Ok(Json(transaction))
}

/// DELETE /api/v1/transactions/:id
pub async fn delete_transaction(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, Json<serde_json::Value>)> {
    let result = sqlx::query(
        "DELETE FROM transactions WHERE id = $1 AND user_id = $2 AND is_manual = TRUE",
    )
    .bind(id)
    .bind(user.user_id)
    .execute(&state.db)
    .await
    .map_err(internal_error)?;

    if result.rows_affected() == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Transaction not found or cannot delete auto-imported transactions" })),
        ));
    }

    Ok(StatusCode::NO_CONTENT)
}

fn internal_error(e: sqlx::Error) -> (StatusCode, Json<serde_json::Value>) {
    tracing::error!("Database error: {}", e);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({ "error": "Internal server error" })),
    )
}

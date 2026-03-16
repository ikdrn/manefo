use axum::{
    middleware as axum_middleware,
    routing::{delete, get, patch, post},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

mod middleware;
mod models;
mod providers;
mod routes;
mod services;

use crate::middleware::auth::auth_middleware;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub supabase_jwt_secret: String,
    pub encryption_key: Vec<u8>,
    pub api_base_url: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 環境変数読み込み
    dotenvy::dotenv().ok();

    // ロギング設定
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("SUPABASE_JWT_SECRET")
        .expect("SUPABASE_JWT_SECRET must be set");
    let encryption_key_hex = std::env::var("ENCRYPTION_KEY")
        .expect("ENCRYPTION_KEY must be set");
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let cors_origin = std::env::var("CORS_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());

    // 暗号化キー（hex → bytes）
    let encryption_key = hex::decode(&encryption_key_hex)
        .expect("ENCRYPTION_KEY must be valid hex string (64 chars = 32 bytes)");
    assert_eq!(encryption_key.len(), 32, "ENCRYPTION_KEY must be 32 bytes (256 bits)");

    // DB接続プール
    let db = PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(std::time::Duration::from_secs(3))
        .connect(&database_url)
        .await?;

    tracing::info!("Database connected");

    let state = Arc::new(AppState {
        db,
        supabase_jwt_secret: jwt_secret,
        encryption_key,
        api_base_url: format!("http://0.0.0.0:{}", port),
    });

    // CORS設定
    let cors = CorsLayer::new()
        .allow_origin(cors_origin.parse::<axum::http::HeaderValue>().unwrap())
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PATCH,
            axum::http::Method::DELETE,
        ])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
        ]);

    // ルーター構築
    let api_router = Router::new()
        // 資産・サマリー
        .route("/assets/summary", get(routes::assets::get_asset_summary))
        .route("/assets/history", get(routes::assets::get_asset_history))
        // 口座
        .route("/accounts", get(routes::accounts::list_accounts))
        .route("/accounts", post(routes::accounts::create_account))
        .route("/accounts/:id", get(routes::accounts::get_account))
        .route("/accounts/:id", patch(routes::accounts::update_account))
        .route("/accounts/:id", delete(routes::accounts::delete_account))
        .route("/accounts/:id/sync", post(routes::accounts::sync_account))
        // 取引
        .route("/transactions", get(routes::transactions::list_transactions))
        .route("/transactions", post(routes::transactions::create_transaction))
        .route("/transactions/:id", patch(routes::transactions::update_transaction))
        .route("/transactions/:id", delete(routes::transactions::delete_transaction))
        // 保有銘柄
        .route("/holdings", get(routes::assets::list_holdings))
        // レポート
        .route("/reports/monthly", get(routes::reports::monthly_report))
        .route("/reports/categories", get(routes::reports::category_report))
        .route("/reports/yearly", get(routes::reports::yearly_report))
        // プロバイダー一覧（口座連携）
        .route("/providers", get(routes::providers::list_providers))
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .route("/health", get(health_check))
        .nest("/api/v1", api_router)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .layer(CompressionLayer::new())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await?;
    tracing::info!("Server listening on port {}", port);

    axum::serve(listener, app).await?;
    Ok(())
}

async fn health_check() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "service": "manefo-backend",
        "version": env!("CARGO_PKG_VERSION")
    }))
}

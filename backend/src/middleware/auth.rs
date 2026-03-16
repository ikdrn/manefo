use axum::{
    extract::{Request, State},
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::AppState;

/// Supabase JWT のクレーム
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SupabaseClaims {
    pub sub: String,   // user UUID
    pub email: Option<String>,
    pub role: Option<String>,
    pub exp: usize,
    pub iat: usize,
    pub aud: Option<String>,
}

/// リクエスト拡張: 認証済みユーザー情報
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub email: Option<String>,
}

/// JWT認証ミドルウェア
pub async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Result<Response, (StatusCode, axum::Json<serde_json::Value>)> {
    let token = extract_bearer_token(req.headers()).ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({ "error": "Authorization header missing or invalid" })),
        )
    })?;

    let claims = verify_jwt(&token, &state.supabase_jwt_secret).map_err(|e| {
        tracing::warn!("JWT verification failed: {}", e);
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({ "error": "Invalid or expired token" })),
        )
    })?;

    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({ "error": "Invalid user ID in token" })),
        )
    })?;

    req.extensions_mut().insert(AuthUser {
        user_id,
        email: claims.email,
    });

    Ok(next.run(req).await)
}

fn extract_bearer_token(headers: &HeaderMap) -> Option<String> {
    let auth = headers.get(axum::http::header::AUTHORIZATION)?.to_str().ok()?;
    auth.strip_prefix("Bearer ").map(String::from)
}

fn verify_jwt(token: &str, secret: &str) -> anyhow::Result<SupabaseClaims> {
    let key = DecodingKey::from_secret(secret.as_bytes());
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_audience(&["authenticated"]);

    let data = decode::<SupabaseClaims>(token, &key, &validation)?;
    Ok(data.claims)
}

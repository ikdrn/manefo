# =============================================================================
# manefo backend Dockerfile (Rust / Axum)
# マルチステージビルドで最小イメージを生成
# =============================================================================

# ビルドステージ
FROM rust:1.80-slim AS builder

WORKDIR /app

# システム依存関係
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 依存関係だけ先にビルド（キャッシュ効率化）
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true
RUN rm -rf src

# ソースをコピーしてビルド
COPY src ./src
RUN touch src/main.rs  # キャッシュ無効化
RUN cargo build --release

# ---------------------------------------------------------------------------
# 実行ステージ（最小イメージ）
# ---------------------------------------------------------------------------
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/manefo-backend .

# 非rootユーザーで実行
RUN useradd -r -s /bin/false manefo
USER manefo

EXPOSE 8080

CMD ["./manefo-backend"]

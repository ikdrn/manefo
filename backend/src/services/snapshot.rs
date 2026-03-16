// =============================================================================
// 資産スナップショットサービス
//
// 毎日深夜に全口座の残高を asset_snapshots テーブルに記録する。
// これにより資産推移グラフの全期間表示が可能になる。
// =============================================================================

use anyhow::Result;
use sqlx::PgPool;
use tracing::{error, info};

/// 全ユーザーの現在残高をスナップショットとして保存
/// Fly.io のスケジューラー（fly.toml の [processes] + cron）から呼び出す
pub async fn take_daily_snapshots(db: &PgPool) -> Result<u64> {
    info!("Starting daily asset snapshot");

    let result = sqlx::query!(
        r#"
        INSERT INTO asset_snapshots (user_id, account_id, snapshot_date, balance, currency)
        SELECT
            user_id,
            id AS account_id,
            CURRENT_DATE AS snapshot_date,
            balance,
            currency
        FROM accounts
        WHERE is_hidden = FALSE
        ON CONFLICT (account_id, snapshot_date) DO UPDATE
            SET balance = EXCLUDED.balance
        "#
    )
    .execute(db)
    .await?;

    info!("Daily snapshot: {} rows upserted", result.rows_affected());
    Ok(result.rows_affected())
}

/// 指定口座の残高を即座にスナップショット（同期後に呼ぶ）
pub async fn take_account_snapshot(
    db: &PgPool,
    account_id: uuid::Uuid,
    user_id: uuid::Uuid,
) -> Result<()> {
    sqlx::query!(
        r#"
        INSERT INTO asset_snapshots (user_id, account_id, snapshot_date, balance, currency)
        SELECT $1, $2, CURRENT_DATE, balance, currency
        FROM accounts
        WHERE id = $2 AND user_id = $1
        ON CONFLICT (account_id, snapshot_date) DO UPDATE
            SET balance = EXCLUDED.balance
        "#,
        user_id,
        account_id
    )
    .execute(db)
    .await?;

    Ok(())
}

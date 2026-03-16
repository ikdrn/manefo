use axum::{http::StatusCode, Json};

/// GET /api/v1/providers
/// 対応金融機関一覧（口座連携）
pub async fn list_providers() -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    // DBから取得するよりもキャッシュが望ましいため、ここでは静的リストを返す
    // 実際はfinancial_institutionsテーブルから取得
    let providers = serde_json::json!([
        { "code": "mizuho",          "name": "みずほ銀行",              "category": "bank",        "is_active": true  },
        { "code": "mufg",            "name": "三菱UFJ銀行",             "category": "bank",        "is_active": true  },
        { "code": "smbc",            "name": "三井住友銀行",            "category": "bank",        "is_active": true  },
        { "code": "rakuten_bank",    "name": "楽天銀行",                "category": "bank",        "is_active": true  },
        { "code": "sbi_bank",        "name": "住信SBIネット銀行",       "category": "bank",        "is_active": true  },
        { "code": "japan_post_bank", "name": "ゆうちょ銀行",            "category": "bank",        "is_active": true  },
        { "code": "sbi_sec",         "name": "SBI証券",                 "category": "securities",  "is_active": true  },
        { "code": "rakuten_sec",     "name": "楽天証券",                "category": "securities",  "is_active": true  },
        { "code": "monex",           "name": "マネックス証券",          "category": "securities",  "is_active": true  },
        { "code": "aukabu",          "name": "auカブコム証券",          "category": "securities",  "is_active": true  },
        { "code": "matsui",          "name": "松井証券",                "category": "securities",  "is_active": true  },
        { "code": "rakuten_card",    "name": "楽天カード",              "category": "credit_card", "is_active": true  },
        { "code": "smbc_card",       "name": "三井住友カード",          "category": "credit_card", "is_active": true  },
        { "code": "bitflyer",        "name": "bitFlyer",               "category": "crypto",      "is_active": false },
        { "code": "coincheck",       "name": "Coincheck",              "category": "crypto",      "is_active": false }
    ]);

    Ok(Json(serde_json::json!({ "providers": providers })))
}

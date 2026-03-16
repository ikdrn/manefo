// =============================================================================
// 暗号化サービス（AES-256-GCM）
//
// 口座認証情報の暗号化・復号化
// クライアントには一切露出しない（バックエンド専用）
// =============================================================================

use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

/// 認証情報を AES-256-GCM で暗号化し、Base64エンコードしたバイト列を返す
/// フォーマット: [12バイトnonce][暗号文]
pub fn encrypt(plaintext: &[u8], key_bytes: &[u8]) -> Result<Vec<u8>> {
    if key_bytes.len() != 32 {
        return Err(anyhow!("Encryption key must be 32 bytes"));
    }

    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);

    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|e| anyhow!("Encryption failed: {}", e))?;

    // nonce (12 bytes) + ciphertext を結合
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

/// AES-256-GCM で復号化
pub fn decrypt(ciphertext_with_nonce: &[u8], key_bytes: &[u8]) -> Result<Vec<u8>> {
    if key_bytes.len() != 32 {
        return Err(anyhow!("Encryption key must be 32 bytes"));
    }
    if ciphertext_with_nonce.len() < 12 {
        return Err(anyhow!("Ciphertext too short"));
    }

    let (nonce_bytes, ciphertext) = ciphertext_with_nonce.split_at(12);
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| anyhow!("Decryption failed: {}", e))?;

    Ok(plaintext)
}

/// JSONとして認証情報を暗号化
pub fn encrypt_json<T: serde::Serialize>(data: &T, key_bytes: &[u8]) -> Result<Vec<u8>> {
    let json = serde_json::to_vec(data).context("Failed to serialize credentials")?;
    encrypt(&json, key_bytes)
}

/// 暗号化された認証情報をJSONとして復号化
pub fn decrypt_json<T: serde::de::DeserializeOwned>(
    ciphertext: &[u8],
    key_bytes: &[u8],
) -> Result<T> {
    let plaintext = decrypt(ciphertext, key_bytes)?;
    serde_json::from_slice(&plaintext).context("Failed to deserialize decrypted data")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key = vec![0u8; 32];
        let plaintext = b"test credentials: password123";

        let encrypted = encrypt(plaintext, &key).unwrap();
        let decrypted = decrypt(&encrypted, &key).unwrap();

        assert_eq!(plaintext.as_ref(), decrypted.as_slice());
    }

    #[test]
    fn test_encrypt_produces_different_ciphertext() {
        let key = vec![0u8; 32];
        let plaintext = b"same plaintext";

        // 同じ平文でも異なるnonce → 異なる暗号文
        let enc1 = encrypt(plaintext, &key).unwrap();
        let enc2 = encrypt(plaintext, &key).unwrap();
        assert_ne!(enc1, enc2);
    }
}

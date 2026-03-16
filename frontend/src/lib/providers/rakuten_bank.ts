import type { AccountCredentials, AccountProvider, CredentialField, SyncResult } from "./index";

export class RakutenBankProvider implements AccountProvider {
  providerCode = "rakuten_bank";
  providerName = "楽天銀行";

  requiredFields(): CredentialField[] {
    return [
      { key: "login_id", label: "ユーザーID", field_type: "text", required: true },
      { key: "password", label: "ログインパスワード", field_type: "password", required: true },
    ];
  }

  validateCredentials(creds: AccountCredentials): void {
    if (!creds.login_id) throw new Error("ユーザーIDを入力してください");
    if (!creds.password) throw new Error("パスワードを入力してください");
  }

  async sync(_accountId: string, _credentials: AccountCredentials): Promise<SyncResult> {
    throw new Error("楽天銀行の自動取得は実装中です。");
  }
}

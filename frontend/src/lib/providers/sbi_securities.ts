import type { AccountCredentials, AccountProvider, CredentialField, SyncResult } from "./index";

export class SbiSecuritiesProvider implements AccountProvider {
  providerCode = "sbi_sec";
  providerName = "SBI証券";

  requiredFields(): CredentialField[] {
    return [
      { key: "login_id", label: "ユーザーネーム", field_type: "text", required: true },
      { key: "password", label: "ログインパスワード", field_type: "password", required: true },
    ];
  }

  validateCredentials(creds: AccountCredentials): void {
    if (!creds.login_id) throw new Error("ユーザーネームを入力してください");
    if (!creds.password) throw new Error("パスワードを入力してください");
  }

  async sync(_accountId: string, _credentials: AccountCredentials): Promise<SyncResult> {
    throw new Error("SBI証券の自動取得は実装中です。");
  }
}

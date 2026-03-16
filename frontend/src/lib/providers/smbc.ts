import type { AccountCredentials, AccountProvider, CredentialField, SyncResult } from "./index";

export class SmbcProvider implements AccountProvider {
  providerCode = "smbc";
  providerName = "三井住友銀行";

  requiredFields(): CredentialField[] {
    return [
      { key: "account_number", label: "口座番号", field_type: "text", required: true, help_text: "SMBCダイレクトの口座番号" },
      { key: "password", label: "ログインパスワード", field_type: "password", required: true },
    ];
  }

  validateCredentials(creds: AccountCredentials): void {
    if (!creds.account_number) throw new Error("口座番号を入力してください");
    if (!creds.password) throw new Error("パスワードを入力してください");
  }

  async sync(_accountId: string, _credentials: AccountCredentials): Promise<SyncResult> {
    throw new Error("三井住友銀行の自動取得は実装中です。");
  }
}

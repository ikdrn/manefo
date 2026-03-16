import type { AccountCredentials, AccountProvider, CredentialField, SyncResult } from "./index";

export class MizuhoProvider implements AccountProvider {
  providerCode = "mizuho";
  providerName = "みずほ銀行";

  requiredFields(): CredentialField[] {
    return [
      { key: "branch_code", label: "店番号", field_type: "number", required: true, placeholder: "000", help_text: "3桁の店番号" },
      { key: "account_number", label: "口座番号", field_type: "number", required: true, placeholder: "0000000", help_text: "7桁の口座番号" },
      { key: "password", label: "ログインパスワード", field_type: "password", required: true },
    ];
  }

  validateCredentials(creds: AccountCredentials): void {
    if (creds.branch_code?.length !== 3) throw new Error("店番号は3桁で入力してください");
    if (creds.account_number?.length !== 7) throw new Error("口座番号は7桁で入力してください");
    if (!creds.password) throw new Error("パスワードを入力してください");
  }

  async sync(_accountId: string, _credentials: AccountCredentials): Promise<SyncResult> {
    // TODO: Playwright/Puppeteer スクレイピング実装
    // Node.js serverless環境でのPlaywright対応:
    //   npm install playwright-chromium
    //   Vercel Fluid Computeを使用（最大800MB）
    throw new Error("みずほ銀行の自動取得は実装中です。手動入力をご利用ください。");
  }
}

/**
 * AccountProvider interface + Registry
 * 各金融機関の口座連携実装はこのinterfaceを実装する
 */

export interface ScrapedTransaction {
  external_id: string;
  transacted_at: string;   // ISO8601
  description: string;
  amount: number;          // 正値=収入、負値=支出
  balance_after?: number;
}

export interface ScrapedHolding {
  ticker: string;
  name: string;
  security_type: string;
  quantity: number;
  average_cost: number;
  current_price?: number;
  currency: string;
}

export interface SyncResult {
  account_id: string;
  current_balance: number;
  transactions: ScrapedTransaction[];
  holdings: ScrapedHolding[];
}

export interface CredentialField {
  key: string;
  label: string;
  field_type: "text" | "password" | "number";
  required: boolean;
  placeholder?: string;
  help_text?: string;
}

export interface AccountCredentials {
  login_id?: string;
  password?: string;
  branch_code?: string;
  account_number?: string;
  [key: string]: string | undefined;
}

export interface AccountProvider {
  providerCode: string;
  providerName: string;
  requiredFields(): CredentialField[];
  validateCredentials(creds: AccountCredentials): void;
  sync(accountId: string, credentials: AccountCredentials): Promise<SyncResult>;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
import { MizuhoProvider } from "./mizuho";
import { SbiSecuritiesProvider } from "./sbi_securities";
import { RakutenBankProvider } from "./rakuten_bank";
import { SmbcProvider } from "./smbc";

const PROVIDERS: AccountProvider[] = [
  new MizuhoProvider(),
  new SbiSecuritiesProvider(),
  new RakutenBankProvider(),
  new SmbcProvider(),
];

export function getProvider(code: string): AccountProvider | undefined {
  return PROVIDERS.find((p) => p.providerCode === code);
}

export function listProviders(): AccountProvider[] {
  return PROVIDERS;
}

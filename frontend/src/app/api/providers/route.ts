import { NextResponse } from "next/server";
import { listProviders } from "@/lib/providers";

// GET /api/providers — 認証不要（公開情報）
export async function GET() {
  const providers = listProviders().map((p) => ({
    code: p.providerCode,
    name: p.providerName,
    required_fields: p.requiredFields(),
  }));

  return NextResponse.json({ providers });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic-link / OTP callback. Supabase redirects here with a `code` (PKCE) or a
// `token_hash`; we exchange it for a session cookie, then send the user home.
// The proxy routes them onward to the correct role home (or /register).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const supabase = await createClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash) {
    await supabase.auth.verifyOtp({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: (type as any) ?? "email",
      token_hash: tokenHash,
    });
  }

  return NextResponse.redirect(`${url.origin}/`);
}

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";

// Supabase Email OTP length — default is 6 digits.
// Accepts 6–10 to handle non-default configurations.
const OTP_LENGTH = 6;
const OTP_RE = /^\d{6,10}$/;

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(codeOverride?: string) {
    const token = (codeOverride ?? code).trim();
    if (!/^\d{6,10}$/.test(token))
      return setError(`Enter the ${OTP_LENGTH}-digit code from your email`);
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) {
      setLoading(false);
      return setError(error.message);
    }
    // Success — keep a full-screen loader up while the proxy resolves the role
    // and routes to the dashboard (this hop can take a few seconds).
    setRedirecting(true);
    router.replace("/");
    router.refresh();
  }

  if (redirecting) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-4 p-12 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-20 w-20 rounded-2xl object-contain" />
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-semibold text-text">Signing you in…</p>
          <p className="text-sm text-text-muted">Setting up your dashboard.</p>
        </CardBody>
      </Card>
    );
  }

  async function resend() {
    setResending(true);
    await createClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setResending(false);
  }

  return (
    <Card>
      <CardBody className="p-7 text-center relative">
        <button 
          onClick={() => router.replace("/login")}
          className="absolute left-3 top-3 p-2 hover:bg-bg-muted rounded-full transition-colors text-text-muted hover:text-text"
          title="Go back / Change email"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-3xl">
          ✉️
        </div>
        <h1 className="text-xl font-extrabold text-text">Verify your email</h1>
        <p className="mt-1 text-sm text-text-muted">
          Click the sign-in link we emailed to
        </p>
        <p className="text-sm font-semibold text-primary">{email}</p>
        <p className="mt-2 text-xs text-text-faint">
          Open the email in this same browser and tap the link. If your email
          shows a code instead, enter it below.
        </p>

        <Input
          className="mt-5 text-center text-2xl tracking-[0.4em]"
          inputMode="numeric"
          maxLength={10}
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 10);
            setCode(v);
            setError(null);
            if (OTP_RE.test(v)) setTimeout(() => verify(v), 50);
          }}
          placeholder={"•".repeat(OTP_LENGTH)}
        />

        {error && <p className="mt-3 text-sm text-error">{error}</p>}

        <Button className="mt-5 w-full" size="lg" loading={loading} onClick={() => verify()}>
          Verify &amp; continue
        </Button>
        <button
          className="mt-4 text-sm text-primary disabled:opacity-50"
          disabled={resending}
          onClick={resend}
        >
          {resending ? "Resending…" : "Resend code"}
        </button>
      </CardBody>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}

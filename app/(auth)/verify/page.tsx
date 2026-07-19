"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";

// Supabase Email OTP length (Auth → Providers → Email → "Email OTP length").
// Keep this in sync with that setting.
const OTP_LENGTH = 8;

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    if (!/^\d{6,10}$/.test(code.trim()))
      return setError(`Enter the ${OTP_LENGTH}-digit code from your email`);
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) return setError(error.message);
    // Proxy routes to the role home, or to /register if no profile yet.
    router.replace("/");
    router.refresh();
  }

  async function resend() {
    setResending(true);
    await createClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setResending(false);
  }

  return (
    <Card>
      <CardBody className="p-7 text-center">
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
          maxLength={OTP_LENGTH}
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH);
            setCode(v);
            if (v.length === OTP_LENGTH) setTimeout(verify, 50);
          }}
          placeholder={"•".repeat(OTP_LENGTH)}
        />

        {error && <p className="mt-3 text-sm text-error">{error}</p>}

        <Button className="mt-5 w-full" size="lg" loading={loading} onClick={verify}>
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

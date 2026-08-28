"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/domain/validators";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { HumanCheck } from "@/components/human-check";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const err = validateEmail(email);
    if (err) return setError(err);
    if (!verified) return setError("Please complete the human check");
    setError(null);
    setLoading(true);
    const supabase = createClient();

    // Check if email is eligible (either pre-existing or matches a valid campus domain)
    const { data: isEligible, error: checkErr } = await supabase.rpc("check_email_eligibility", { p_email: email.trim() });

    if (checkErr) {
      setLoading(false);
      return setError("Could not verify email eligibility. Please try again.");
    }

    if (!isEligible) {
      setLoading(false);
      return setError("Only specific domain emails can register, unless explicitly invited.");
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        // Free-tier Supabase emails a magic link → this is where it lands.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      console.error("Supabase auth error:", error);
      let msg = error.message;
      if (!msg || msg === "{}" || msg === "{}") {
        msg = "Email delivery failed. The custom SMTP settings in Supabase are likely incorrect or being blocked by the email provider.";
      }
      return setError(msg);
    }
    router.push(`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
  }

  return (
    <Card>
      <CardBody className="p-7">
        <div className="mb-6 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="CFD Treats Hub"
            className="h-20 w-20 rounded-2xl object-contain shrink-0"
          />
          <div className="text-left">
            <h1 className="text-xl sm:text-2xl font-extrabold text-text leading-tight whitespace-nowrap">CFD Treats Hub</h1>
            <p className="text-sm italic text-primary">– Cravings Fulfilled Daily –</p>
          </div>
        </div>

        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          placeholder="f23-1234@cfd.nu.edu.pk"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        <div className="mt-4">
          <HumanCheck onVerified={() => setVerified(true)} />
        </div>

        {error && <p className="mt-3 text-sm text-error">{error}</p>}

        <Button
          className="mt-5 w-full"
          size="lg"
          loading={loading}
          onClick={submit}
        >
          Send login code
        </Button>
        <p className="mt-4 text-center text-xs text-text-faint">
          We&apos;ll email you a sign-in code. New here? The same code registers you.
        </p>
      </CardBody>
    </Card>
  );
}

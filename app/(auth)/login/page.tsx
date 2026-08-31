"use client";

import { useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase/config";
import { sendSignInLinkToEmail } from "firebase/auth";
import { validateEmail } from "@/lib/domain/validators";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { HumanCheck } from "@/components/human-check";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    const err = validateEmail(email);
    if (err) return setError(err);
    if (!verified) return setError("Please complete the human check");

    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const actionCodeSettings = {
        url: `${window.location.origin}/verify`,
        handleCodeInApp: true,
      };

      console.log("[v0] Starting Firebase magic-link sign-in", {
        emailDomain: normalizedEmail.split("@")[1] ?? "unknown",
        origin: window.location.origin,
      });

      await sendSignInLinkToEmail(
        getFirebaseAuth(),
        normalizedEmail,
        actionCodeSettings
      );

      window.localStorage.setItem("emailForSignIn", normalizedEmail);
      window.localStorage.setItem("magicLinkSentAt", String(Date.now()));

      setSent(true);
    } catch (err: unknown) {
      const firebaseError = err as {
        code?: string;
        message?: string;
      };

      console.error("[v0] Firebase magic-link sign-in failed", {
        code: firebaseError.code,
        message: firebaseError.message,
      });

      const messages: Record<string, string> = {
        "auth/invalid-api-key":
          "Firebase rejected the Web API key. Verify NEXT_PUBLIC_FIREBASE_API_KEY belongs to the cfd-treats-hub project.",
        "auth/operation-not-allowed":
          "Email-link sign-in is disabled in Firebase Authentication. Enable it under Sign-in providers.",
        "auth/unauthorized-continue-uri":
          "This preview domain is not authorized in Firebase. Add it under Authentication > Settings > Authorized domains.",
        "auth/invalid-continue-uri":
          "Firebase rejected the sign-in redirect URL. Check the authorized domain and Firebase Web SDK configuration.",
        "auth/quota-exceeded":
          "Firebase email quota has been exceeded. Try again later or check the Firebase billing settings.",
      };

      setError(
        messages[firebaseError.code ?? ""] ??
        firebaseError.message ??
        "Failed to send magic link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-4 p-8 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background:
                "color-mix(in srgb, var(--color-primary) 20%, transparent)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              style={{ color: "var(--color-primary)" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <div>
            <h2
              className="mb-1 text-xl font-extrabold"
              style={{ color: "var(--color-text)" }}
            >
              Magic link sent!
            </h2>
            <p
              className="text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              We sent a sign-in link to
            </p>
            <p
              className="mt-1 text-sm font-semibold"
              style={{ color: "var(--color-primary)" }}
            >
              {email}
            </p>
          </div>

          <div
            className="w-full rounded-xl p-4 text-left text-xs"
            style={{
              background:
                "color-mix(in srgb, var(--color-primary) 8%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)",
            }}
          >
            <p style={{ color: "var(--color-text)" }}>
              Check your <strong>inbox</strong> and spam folder.
            </p>
            <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
              The link expires in <strong>10 minutes</strong>.
            </p>
            <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
              The link works on any device.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSent(false)}
          >
            Use a different email
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="p-7">
        <div className="mb-6 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="CFD Treats Hub"
            className="h-20 w-20 shrink-0 rounded-2xl object-contain"
          />

          <div className="text-left">
            <h1 className="whitespace-nowrap text-xl font-extrabold leading-tight text-text sm:text-2xl">
              CFD Treats Hub
            </h1>
            <p className="text-sm italic text-primary">
              - Cravings Fulfilled Daily -
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            placeholder="f23-1234@cfd.nu.edu.pk"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.nativeEvent.isComposing &&
                event.keyCode !== 229
              ) {
                submit();
              }
            }}
          />
        </div>

        <div className="mt-4">
          <HumanCheck onVerified={() => setVerified(true)} />
        </div>

        {error && (
          <p className="mt-3 text-sm text-error" role="alert">
            {error}
          </p>
        )}

        <Button
          className="mt-5 w-full"
          size="lg"
          loading={loading}
          onClick={submit}
        >
          Send Magic Link
        </Button>

        <p className="mt-4 text-center text-xs text-text-faint">
          New here? Your account will be created automatically. Just enter your
          email.
        </p>
      </CardBody>
    </Card>
  );
}
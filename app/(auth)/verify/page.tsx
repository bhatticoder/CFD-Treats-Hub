"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { firebaseAuth } from "@/lib/firebase/config";
import { isSignInWithEmailLink, signInWithEmailLink, getAdditionalUserInfo } from "firebase/auth";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Loader2, MailCheck, ShieldAlert, Clock } from "lucide-react";

// ── Link expiry: 10 minutes ──────────────────────────────────────────────────
const LINK_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function isLinkExpired(): boolean {
  const sentAt = window.localStorage.getItem("magicLinkSentAt");
  if (!sentAt) return false; // no timestamp → can't verify, allow through
  return Date.now() - Number(sentAt) > LINK_EXPIRY_MS;
}

// ── Styled email-prompt modal ─────────────────────────────────────────────────
function EmailPromptModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (email: string) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 p-7 shadow-2xl"
        style={{ background: "var(--color-surface)" }}
      >
        {/* Icon */}
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--color-primary) 20%, transparent)" }}
          >
            <MailCheck className="h-7 w-7" style={{ color: "var(--color-primary)" }} />
          </div>
          <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
            Confirm your email
          </h2>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            It looks like you opened this link on a different device. Please re-enter your email to
            complete sign-in.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="confirm-email">Email address</Label>
            <Input
              id="confirm-email"
              type="email"
              inputMode="email"
              placeholder="f23-1234@cfd.nu.edu.pk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && email && onConfirm(email.trim().toLowerCase())}
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!email}
              onClick={() => email && onConfirm(email.trim().toLowerCase())}
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main verify content ───────────────────────────────────────────────────────
function VerifyContent() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "prompt" | "error" | "expired">("loading");
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignInWithEmailLink(firebaseAuth, window.location.href)) {
      setError("Invalid magic link. Please request a new one from the login page.");
      setStatus("error");
      return;
    }

    // Check expiry
    if (isLinkExpired()) {
      setStatus("expired");
      return;
    }

    const storedEmail = window.localStorage.getItem("emailForSignIn");
    if (!storedEmail) {
      // Different device → show styled prompt
      setStatus("prompt");
    } else {
      handleSignIn(storedEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignIn(email: string) {
    setStatus("loading");
    try {
      const result = await signInWithEmailLink(firebaseAuth, email, window.location.href);
      window.localStorage.removeItem("emailForSignIn");
      window.localStorage.removeItem("magicLinkSentAt");

      const idToken = await result.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = body?.error || body?.message || `Session endpoint returned ${res.status}`;
        throw new Error(msg);
      }

      const { needsRegistration } = body;

      router.replace(needsRegistration ? "/register" : "/");
    } catch (err: unknown) {
      console.error("Link verify error:", err);
      const e = err as { code?: string; message?: string };
      if (e.code === "auth/invalid-action-code" || e.code === "auth/expired-action-code") {
        setStatus("expired");
      } else {
        setError(`Error [${e.code ?? "unknown"}]: ${e.message ?? "Could not verify your link. Please request a new one."}`);
        setStatus("error");
      }
    }
  }

  // ── Expired ─────────────────────────────────────────────────────────────────
  if (status === "expired") {
    return (
      <Card>
        <CardBody className="p-8 text-center flex flex-col items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--color-warning, #f59e0b) 20%, transparent)" }}
          >
            <Clock className="h-7 w-7" style={{ color: "var(--color-warning, #f59e0b)" }} />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>
              Link Expired
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              This magic link has expired for your security. Please request a fresh one.
            </p>
          </div>
          <Button onClick={() => router.replace("/login")}>Back to Login</Button>
        </CardBody>
      </Card>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <Card>
        <CardBody className="p-8 text-center flex flex-col items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--color-error) 20%, transparent)" }}
          >
            <ShieldAlert className="h-7 w-7 text-error" />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>
              Sign-in Failed
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {error}
            </p>
          </div>
          <Button onClick={() => router.replace("/login")}>Back to Login</Button>
        </CardBody>
      </Card>
    );
  }

  // ── Email prompt (different device) ─────────────────────────────────────────
  if (status === "prompt" && pendingEmail === null) {
    return (
      <>
        {/* Background loading card */}
        <Card>
          <CardBody className="p-10 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: "var(--color-primary)" }} />
            <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
              Verifying your link...
            </h2>
            <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
              Please wait, logging you in.
            </p>
          </CardBody>
        </Card>
        <EmailPromptModal
          onConfirm={(email) => {
            setPendingEmail(email);
            handleSignIn(email);
          }}
          onCancel={() => {
            setError("Sign-in cancelled. Please request a new magic link.");
            setStatus("error");
          }}
        />
      </>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardBody className="p-10 text-center flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: "var(--color-primary)" }} />
        <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          Verifying your link...
        </h2>
        <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
          Please wait, logging you in.
        </p>
      </CardBody>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center" style={{ color: "var(--color-text-muted)" }}>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}

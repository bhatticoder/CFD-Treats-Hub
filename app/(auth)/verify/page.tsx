"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase/config";
import {
  getAdditionalUserInfo,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Clock,
  Loader2,
  MailCheck,
  ShieldAlert,
} from "lucide-react";

const LINK_EXPIRY_MS = 10 * 60 * 1000;

function isLinkExpired(): boolean {
  const sentAt = window.localStorage.getItem("magicLinkSentAt");

  if (!sentAt) return false;

  return Date.now() - Number(sentAt) > LINK_EXPIRY_MS;
}

function EmailPromptModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (email: string) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 p-7 shadow-2xl"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              background:
                "color-mix(in srgb, var(--color-primary) 20%, transparent)",
            }}
          >
            <MailCheck
              className="h-7 w-7"
              style={{ color: "var(--color-primary)" }}
              aria-hidden="true"
            />
          </div>

          <h2
            className="text-lg font-bold"
            style={{ color: "var(--color-text)" }}
          >
            Confirm your email
          </h2>

          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--color-text-muted)" }}
          >
            It looks like you opened this link on a different device. Please
            re-enter your email to complete sign-in.
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
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.nativeEvent.isComposing &&
                  event.keyCode !== 229 &&
                  email.trim()
                ) {
                  onConfirm(email.trim().toLowerCase());
                }
              }}
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>

            <Button
              className="flex-1"
              disabled={!email.trim()}
              onClick={() => {
                if (email.trim()) {
                  onConfirm(email.trim().toLowerCase());
                }
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifyContent() {
  const router = useRouter();
  const [status, setStatus] = useState<
    "loading" | "prompt" | "error" | "expired"
  >("loading");
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const currentUrl = window.location.href;

    if (!isSignInWithEmailLink(auth, currentUrl)) {
      setError("Invalid magic link. Please request a new one from the login page.");
      setStatus("error");
      return;
    }

    if (isLinkExpired()) {
      setStatus("expired");
      return;
    }

    const storedEmail = window.localStorage.getItem("emailForSignIn");

    if (!storedEmail) {
      setStatus("prompt");
      return;
    }

    void handleSignIn(storedEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignIn(email: string) {
    setStatus("loading");
    setError(null);

    try {
      const auth = getFirebaseAuth();
      const currentUrl = window.location.href;

      const result = await signInWithEmailLink(auth, email, currentUrl);

      window.localStorage.removeItem("emailForSignIn");
      window.localStorage.removeItem("magicLinkSentAt");

      const idToken = await result.user.getIdToken();

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.error ||
          body?.message ||
          `Session endpoint returned ${response.status}`
        );
      }

      const additionalUserInfo = getAdditionalUserInfo(result);
      const needsRegistration =
        body?.needsRegistration ?? additionalUserInfo?.isNewUser ?? false;

      router.replace(needsRegistration ? "/register" : "/");
    } catch (err: unknown) {
      console.error("[v0] Link verification failed", {
        code: typeof err === "object" && err && "code" in err ? err.code : undefined,
        message: err instanceof Error ? err.message : String(err),
      });

      const firebaseError = err as {
        code?: string;
        message?: string;
      };

      if (
        firebaseError.code === "auth/invalid-action-code" ||
        firebaseError.code === "auth/expired-action-code"
      ) {
        setStatus("expired");
        return;
      }

      setError(
        firebaseError.message === "Authentication service unavailable"
          ? "The link was accepted, but the server session could not be created. Check the Firebase Admin configuration."
          : `Error [${firebaseError.code ?? "unknown"
          }]: ${firebaseError.message ??
          "Could not verify your link. Please request a new one."
          }`
      );

      setStatus("error");
    }
  }

  if (status === "expired") {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-4 p-8 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              background:
                "color-mix(in srgb, var(--color-warning, #f59e0b) 20%, transparent)",
            }}
          >
            <Clock
              className="h-7 w-7"
              style={{ color: "var(--color-warning, #f59e0b)" }}
              aria-hidden="true"
            />
          </div>

          <div>
            <h2
              className="mb-1 text-lg font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Link Expired
            </h2>

            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              This magic link has expired for your security. Please request a
              fresh one.
            </p>
          </div>

          <Button onClick={() => router.replace("/login")}>
            Back to Login
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-4 p-8 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              background:
                "color-mix(in srgb, var(--color-error) 20%, transparent)",
            }}
          >
            <ShieldAlert
              className="h-7 w-7"
              style={{ color: "var(--color-error)" }}
              aria-hidden="true"
            />
          </div>

          <div>
            <h2
              className="mb-1 text-lg font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Sign-in Failed
            </h2>

            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              {error}
            </p>
          </div>

          <Button onClick={() => router.replace("/login")}>
            Back to Login
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (status === "prompt" && pendingEmail === null) {
    return (
      <>
        <Card>
          <CardBody className="flex flex-col items-center justify-center p-10 text-center">
            <Loader2
              className="mb-4 h-8 w-8 animate-spin"
              style={{ color: "var(--color-primary)" }}
              aria-hidden="true"
            />

            <h2
              className="text-xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Verifying your link...
            </h2>

            <p
              className="mt-2 text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              Please wait, logging you in.
            </p>
          </CardBody>
        </Card>

        <EmailPromptModal
          onConfirm={(email) => {
            setPendingEmail(email);
            void handleSignIn(email);
          }}
          onCancel={() => {
            setError("Sign-in cancelled. Please request a new magic link.");
            setStatus("error");
          }}
        />
      </>
    );
  }

  return (
    <Card>
      <CardBody className="flex flex-col items-center justify-center p-10 text-center">
        <Loader2
          className="mb-4 h-8 w-8 animate-spin"
          style={{ color: "var(--color-primary)" }}
          aria-hidden="true"
        />

        <h2
          className="text-xl font-bold"
          style={{ color: "var(--color-text)" }}
        >
          Verifying your link...
        </h2>

        <p
          className="mt-2 text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          Please wait, logging you in.
        </p>
      </CardBody>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div
          className="p-8 text-center"
          style={{ color: "var(--color-text-muted)" }}
        >
          Loading...
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
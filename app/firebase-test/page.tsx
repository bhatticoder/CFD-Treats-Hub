"use client";

import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase/config";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from "firebase/auth";

export default function FirebaseTestPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function testSignUp() {
    setLoading(true);
    setStatus("Creating account...");
    try {
      const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await sendEmailVerification(result.user);
      setStatus(`✅ Account created! Verification email sent to ${email}. UID: ${result.user.uid}`);
    } catch (err: unknown) {
      const error = err as { message: string };
      setStatus(`❌ Signup Error: ${error.message}`);
    }
    setLoading(false);
  }

  async function testSignIn() {
    setLoading(true);
    setStatus("Signing in...");
    try {
      const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
      setStatus(`✅ Signed in! UID: ${result.user.uid}, Email verified: ${result.user.emailVerified}`);
    } catch (err: unknown) {
      const error = err as { message: string };
      setStatus(`❌ Login Error: ${error.message}`);
    }
    setLoading(false);
  }

  async function testSignOut() {
    await signOut(firebaseAuth);
    setStatus("✅ Signed out!");
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "500px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
        🔥 Firebase Test Page
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#888", marginBottom: "1.5rem" }}>
        This page tests Firebase Auth independently. Supabase is untouched.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: "0.5rem", border: "1px solid #555", borderRadius: "6px", background: "#1a1a1a", color: "#fff" }}
        />
        <input
          type="password"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: "0.5rem", border: "1px solid #555", borderRadius: "6px", background: "#1a1a1a", color: "#fff" }}
        />

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            onClick={testSignUp} 
            disabled={loading}
            style={{ flex: 1, padding: "0.5rem", background: "#f59e0b", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
          >
            Sign Up
          </button>
          <button 
            onClick={testSignIn} 
            disabled={loading}
            style={{ flex: 1, padding: "0.5rem", background: "#22c55e", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
          >
            Sign In
          </button>
          <button 
            onClick={testSignOut}
            style={{ flex: 1, padding: "0.5rem", background: "#ef4444", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", color: "#fff" }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {status && (
        <div style={{ 
          marginTop: "1rem", 
          padding: "0.75rem", 
          background: status.startsWith("✅") ? "#052e16" : status.startsWith("❌") ? "#450a0a" : "#1a1a1a", 
          borderRadius: "6px",
          fontSize: "0.875rem",
          color: "#fff",
          wordBreak: "break-all"
        }}>
          {status}
        </div>
      )}
    </div>
  );
}

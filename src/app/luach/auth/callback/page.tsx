"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { loadProfile, migrateLocalDraftIfAny } from "@/lib/parent";

export default function ParentAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("מתחבר...");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      setStatus("בודק פרופיל...");
      await migrateLocalDraftIfAny();
      const profile = await loadProfile();
      if (cancelled) return;
      router.replace(profile ? "/luach/my" : "/luach/onboarding");
    }

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        setStatus("מאמת...");
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { setError("שגיאה באימות: " + error.message); return; }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) { finish(); return; }

      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        if (s?.user) finish();
      });

      setTimeout(() => {
        if (cancelled) return;
        sub.subscription.unsubscribe();
        if (!error) setError("ההתחברות לא הושלמה. נסה שוב.");
      }, 5000);
    })();

    return () => { cancelled = true; };
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#fafaf7", padding: 20,
    }}>
      <div style={{ textAlign: "center", maxWidth: 460 }}>
        {error ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
            <h2 style={{ fontSize: 18, color: "var(--danger)", margin: "0 0 12px" }}>שגיאה בהתחברות</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-line", marginBottom: 20, lineHeight: 1.6 }}>{error}</p>
            <button onClick={() => router.push("/luach/login")} style={{
              padding: "10px 22px", fontSize: 13, fontWeight: 500,
              background: "var(--parent-primary)", color: "#fff", border: "none",
              borderRadius: "var(--radius-md)", cursor: "pointer",
            }}>חזרה לכניסה</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{status}</p>
          </>
        )}
      </div>
    </div>
  );
}

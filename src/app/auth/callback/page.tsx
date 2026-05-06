"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getUserByEmail, saveSession } from "@/lib/auth";
import { fetchProfile } from "@/lib/parent";

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  // `next` is set by /luach/login to route residents back into the parent flow.
  const nextUrl = params.get("next");

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("מתחבר...");

  useEffect(() => {
    let cancelled = false;

    async function routeResident() {
      // Resident flow: check if profile exists, route accordingly.
      const profile = await fetchProfile();
      if (cancelled) return;
      if (profile) router.replace("/luach/my");
      else         router.replace("/luach/onboarding");
    }

    async function processSession(email: string) {
      // If the login originated from /luach/login, treat as resident regardless of staff table.
      if (nextUrl && nextUrl.startsWith("/luach")) {
        setStatus("טוען את הפרופיל שלך...");
        await routeResident();
        return;
      }

      setStatus("בודק הרשאות...");
      const appUser = await getUserByEmail(email);
      if (cancelled) return;

      if (appUser) {
        // Staff member
        saveSession(appUser);
        if (appUser.role === "admin")                router.replace("/admin");
        else if (appUser.department === "education") router.replace("/education");
        else if (appUser.department === "youth")     router.replace("/youth");
        else                                          router.replace("/");
        return;
      }

      // Not in staff table — treat as resident.
      await routeResident();
    }

    (async () => {
      const url = new URL(window.location.href);

      // Supabase returns errors via the URL hash (e.g. expired magic link).
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(hash);
      const hashError = hashParams.get("error");
      const hashErrorCode = hashParams.get("error_code");
      if (hashError) {
        if (hashErrorCode === "otp_expired") {
          setError("הקישור פג תוקף או שכבר השתמשת בו.\nחזור לדף ההתחברות ובקש קישור חדש.");
        } else {
          setError("ההתחברות נכשלה: " + (hashParams.get("error_description") || hashError));
        }
        return;
      }

      const code = url.searchParams.get("code");
      if (code) {
        setStatus("מאמת...");
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError("שגיאה באימות: " + error.message);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        processSession(session.user.email);
        return;
      }

      const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.email) processSession(session.user.email);
      });

      setTimeout(() => {
        if (cancelled) return;
        subscription.subscription.unsubscribe();
        if (!error) {
          setError("ההתחברות לא הושלמה. נסה שוב.\nוודא שה-Site URL וה-Redirect URLs מוגדרים נכון ב-Supabase.");
        }
      }, 5000);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              background: "#1A1A1A", color: "#fff", border: "none",
              borderRadius: "var(--radius-md)", cursor: "pointer",
            }}>בקש קישור חדש</button>
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

export default function AuthCallbackPage() {
  return <Suspense fallback={null}><AuthCallbackContent /></Suspense>;
}

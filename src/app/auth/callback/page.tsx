"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getUserByEmail, saveSession, createUser, type AppUser } from "@/lib/auth";
import { fetchProfile } from "@/lib/parent";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intendedDept = searchParams.get("dept");
  // `next` is set by /luach/login to route residents back into the parent flow.
  const nextUrl = searchParams.get("next");
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [status, setStatus] = useState("מתחבר...");

  useEffect(() => {
    let cancelled = false;

    async function routeResident() {
      const profile = await fetchProfile();
      if (cancelled) return;
      if (profile) router.replace("/luach/my");
      else         router.replace("/luach/onboarding");
    }

    async function processSession(email: string, fullName: string) {
      // If the login originated from /luach/login, treat as resident regardless of staff table.
      if (nextUrl && nextUrl.startsWith("/luach")) {
        setStatus("טוען את הפרופיל שלך...");
        await routeResident();
        return;
      }


      setStatus("בודק הרשאות...");
      let appUser: AppUser | null = await getUserByEmail(email);
      if (cancelled) return;

      if (!appUser) {
        setStatus("רושם בקשה...");
        const dept: "education" | "youth" = intendedDept === "youth" ? "youth" : "education";
        const { data, error: insertError } = await createUser({
          email, full_name: fullName, role: "staff", department: dept, active: false,
        });
        if (insertError || !data) {
          await supabase.auth.signOut();
          setError("שגיאה ביצירת בקשה: " + (insertError?.message || "לא ידוע"));
          return;
        }
        appUser = data as AppUser;
      }

      if (!appUser.active) {
        await supabase.auth.signOut();
        setPendingEmail(email);
        return;
      }

      saveSession(appUser);
      if (appUser.role === "admin")                router.replace("/admin");
      else if (appUser.department === "education") router.replace("/education");
      else if (appUser.department === "youth")     router.replace("/youth");
      else                                          router.replace("/");
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

      function nameFromSession(s: { user: { email?: string; user_metadata?: { full_name?: string; name?: string } } }) {
        return s.user.user_metadata?.full_name || s.user.user_metadata?.name || s.user.email?.split("@")[0] || "משתמש חדש";
      }


      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        processSession(session.user.email, nameFromSession(session));
        return;
      }

      const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.email) processSession(session.user.email, nameFromSession(session));
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
        {pendingEmail ? (
          <>
            <div style={{ fontSize: 50, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 12px", color: "var(--text-primary)" }}>
              הבקשה שלך התקבלה!
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>
              הבקשה שלך נשלחה למנהל-העל לאישור.<br/>
              ברגע שתאושר תוכל להיכנס למערכת.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>📧 {pendingEmail}</p>
            <button onClick={() => router.push("/")} style={{
              padding: "10px 22px", fontSize: 13, fontWeight: 500,
              background: "#1A1A1A", color: "#fff", border: "none",
              borderRadius: "var(--radius-md)", cursor: "pointer",
            }}>חזרה לדף הבית</button>
          </>
        ) : error ? (
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

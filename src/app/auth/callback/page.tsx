"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { getUserByEmail, saveSession, createUser, type AppUser } from "@/lib/auth";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intendedDept = searchParams.get("dept");
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [status, setStatus] = useState("מתחבר...");

  useEffect(() => {
    let cancelled = false;

    async function processSession(email: string, fullName: string) {
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

    // אם יש קוד OAuth ב-URL, החלף אותו ל-session
    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        setStatus("מאמת מול Google...");
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError("שגיאה באימות: " + error.message);
          return;
        }
      }

      function nameFromSession(s: { user: { email?: string; user_metadata?: { full_name?: string; name?: string } } }) {
        return s.user.user_metadata?.full_name || s.user.user_metadata?.name || s.user.email?.split("@")[0] || "משתמש חדש";
      }

      // בדיקה ראשונית
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        processSession(session.user.email, nameFromSession(session));
        return;
      }

      // המתנה ל-session דרך listener (במקרה שהוא לא עלה מיד)
      const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.email) processSession(session.user.email, nameFromSession(session));
      });

      // טיימאאוט: אם תוך 5 שניות לא הגיע session - שגיאה
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
            <button onClick={() => router.push("/login")} style={{
              padding: "10px 22px", fontSize: 13, fontWeight: 500,
              background: "#1A1A1A", color: "#fff", border: "none",
              borderRadius: "var(--radius-md)", cursor: "pointer",
            }}>חזרה למסך ההתחברות</button>
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

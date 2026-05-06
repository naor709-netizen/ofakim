"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getUserByEmail, saveSession } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("מתחבר...");

  useEffect(() => {
    let cancelled = false;

    async function processSession(email: string) {
      setStatus("בודק הרשאות...");
      const appUser = await getUserByEmail(email);
      if (cancelled) return;
      if (!appUser) {
        await supabase.auth.signOut();
        setError(`המייל ${email} לא רשום במערכת.\n\nפנה למנהל-העל כדי להוסיף אותך,\nאו תעדכן את ה-SQL ב-Supabase כך שיכלול את המייל הזה.`);
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

      // בדיקה ראשונית
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        processSession(session.user.email);
        return;
      }

      // המתנה ל-session דרך listener (במקרה שהוא לא עלה מיד)
      const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.email) processSession(session.user.email);
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
        {error ? (
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAllUsers, type AppUser } from "@/lib/auth";

export function NotificationBell({ adminOnly = false }: { adminOnly?: boolean }) {
  const [pendingUsers, setPendingUsers] = useState<AppUser[]>([]);
  const [open, setOpen] = useState(false);

  async function refresh() {
    const users = await getAllUsers();
    setPendingUsers(users.filter(u => !u.active));
  }

  useEffect(() => {
    if (!adminOnly) return;
    refresh();
    const channel = supabase
      .channel("notif-users")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [adminOnly]);

  if (!adminOnly) return null;

  const count = pendingUsers.length;

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: 36, height: 36, borderRadius: "50%",
        background: "rgba(255,255,255,0.18)", color: "#fff",
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        🔔
        {count > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            background: "#FFD23F", color: "#1A1A1A",
            fontSize: 10, fontWeight: 700,
            minWidth: 18, height: 18, borderRadius: 9,
            padding: "0 5px",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #1A1A1A",
          }}>{count}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: 44, left: 0,
          width: 320, maxHeight: 400, overflowY: "auto",
          background: "#fff", color: "var(--ink)",
          borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
          border: "0.5px solid var(--line)", zIndex: 100,
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "0.5px solid var(--line)",
            fontWeight: 600, fontSize: 14,
          }}>
            התראות
          </div>

          {count === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--ink3)", fontSize: 13 }}>
              אין התראות חדשות 🎉
            </div>
          ) : (
            <>
              <div style={{
                padding: "8px 16px", fontSize: 11,
                color: "var(--ink3)", textTransform: "uppercase",
                letterSpacing: "0.05em", fontFamily: "var(--font-mono)",
              }}>
                ⏳ ממתינים לאישור ({count})
              </div>
              {pendingUsers.map(u => (
                <Link key={u.id} href="/admin/users" style={{
                  display: "block", padding: "10px 16px",
                  borderTop: "0.5px solid var(--line)",
                  textDecoration: "none", color: "inherit",
                }}
                  onClick={() => setOpen(false)}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{u.full_name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>
                    {u.email} · {u.department === "education" ? "🔵 חינוך" : "🟠 נוער"}
                  </div>
                </Link>
              ))}
              <Link href="/admin/users" style={{
                display: "block", padding: "10px 16px",
                background: "var(--paper2)",
                fontSize: 12, fontWeight: 500, color: "var(--ink2)",
                textAlign: "center", textDecoration: "none",
                borderTop: "0.5px solid var(--line)",
              }} onClick={() => setOpen(false)}>
                לכל הבקשות ←
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

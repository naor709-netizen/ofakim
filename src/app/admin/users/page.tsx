"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAllUsers, createUser, updateUser, deleteUser, loadSession, type AppUser } from "@/lib/auth";
import { TopBar } from "@/components/v3/TopBar";

export default function UsersAdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<AppUser> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [me, setMe] = useState<AppUser | null>(null);
  const [tab, setTab] = useState<"pending" | "all">("pending");

  useEffect(() => {
    const session = loadSession();
    if (!session || session.role !== "admin") {
      router.push("/login");
      return;
    }
    setMe(session);
    refresh();
  }, [router]);

  async function refresh() {
    setLoading(true);
    setUsers(await getAllUsers());
    setLoading(false);
  }

  function openCreate() {
    setEditing({ email: "", full_name: "", role: "staff", department: "education", active: true });
    setShowForm(true);
  }
  function openEdit(u: AppUser) {
    setEditing({ ...u });
    setShowForm(true);
  }

  async function handleSave() {
    if (!editing || !editing.email || !editing.full_name) return;
    const result = editing.id
      ? await updateUser(editing.id, editing)
      : await createUser({
          email:      editing.email,
          full_name:  editing.full_name,
          role:       editing.role as "admin" | "staff",
          department: (editing.department as "education" | "youth" | null) ?? null,
          active:     editing.active ?? true,
        });
    if (result.error) { alert("שגיאה: " + result.error.message); return; }
    setShowForm(false); setEditing(null);
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק את העובד? לא יוכל להתחבר יותר.")) return;
    await deleteUser(id);
    refresh();
  }

  async function approveUser(id: string) {
    await updateUser(id, { active: true });
    refresh();
  }

  const grouped = {
    pending:   users.filter(u => !u.active),
    admin:     users.filter(u => u.active && u.role === "admin"),
    education: users.filter(u => u.active && u.role === "staff" && u.department === "education"),
    youth:     users.filter(u => u.active && u.role === "staff" && u.department === "youth"),
  };

  if (!me) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <TopBar
        variant="admin"
        title="ניהול עובדים"
        subtitle="USERS · MANAGE"
        rightContent={
          <Link href="/admin" style={{
            color: "rgba(255,255,255,0.85)", textDecoration: "none",
            fontSize: 12, padding: "6px 12px",
            background: "rgba(255,255,255,0.15)", borderRadius: 8,
          }}>← דשבורד</Link>
        }
      />

      <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>

        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg, #185FA5 0%, #7F77DD 50%, #BE185D 100%)",
          borderRadius: 22, padding: "1.5rem 2rem",
          marginBottom: 20, position: "relative", overflow: "hidden",
          color: "#fff",
        }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.12)", filter: "blur(40px)" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, opacity: 0.85, textTransform: "uppercase" }}>
                👥 STAFF MANAGEMENT
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: "6px 0 4px", letterSpacing: -0.3 }}>
                ניהול עובדים
              </h1>
              <p style={{ fontSize: 13, margin: 0, opacity: 0.92 }}>
                {users.length} עובדים רשומים · {grouped.pending.length > 0 && (
                  <strong>⏳ {grouped.pending.length} ממתינים לאישור</strong>
                )}
              </p>
            </div>
            <button onClick={openCreate} style={{
              padding: "10px 20px", fontSize: 13, fontWeight: 600,
              background: "rgba(255,255,255,0.95)", color: "#185FA5",
              border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              + עובד חדש
            </button>
          </div>
        </div>

        {/* טאבים: ממתינים | הכל */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
          {([
            { id: "pending", label: "ממתינים לאישור", count: grouped.pending.length, accent: "#7C4A0A" },
            { id: "all",     label: "כל העובדים",      count: grouped.admin.length + grouped.education.length + grouped.youth.length, accent: "#1A1A1A" },
          ] as const).map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: "none", border: "none", padding: "10px 18px", fontSize: 13,
                cursor: "pointer", fontFamily: "inherit",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: active ? 600 : 400,
                borderBottom: active ? `2px solid ${t.accent}` : "2px solid transparent",
                marginBottom: -1,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {t.label}
                {t.count > 0 && (
                  <span style={{
                    fontSize: 10, padding: "1px 7px", borderRadius: 10,
                    background: t.id === "pending" ? "#F5C57E" : "var(--bg-secondary)",
                    color: t.id === "pending" ? "#7C4A0A" : "var(--text-secondary)",
                    fontWeight: 600,
                  }}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? <p>טוען...</p> : tab === "pending" ? (
          grouped.pending.length === 0 ? (
            <div style={{
              background: "#fff", borderRadius: "var(--radius-lg)",
              padding: "3rem 1rem", textAlign: "center",
              border: "0.5px solid var(--border)",
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✓</div>
              <h3 style={{ fontSize: 15, fontWeight: 500, margin: "0 0 6px" }}>אין בקשות ממתינות</h3>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0 }}>
                כשעובד יבקש להירשם, הוא יופיע כאן ותוכל לאשר אותו בלחיצה
              </p>
            </div>
          ) : (
            <PendingSection list={grouped.pending} onApprove={approveUser} onEdit={openEdit} onDelete={handleDelete} />
          )
        ) : (
          <>
            {grouped.pending.length > 0 && (
              <div style={{
                background: "#FFF8EE", border: "1px solid #F5C57E",
                borderRadius: "var(--radius-md)", padding: "10px 14px",
                marginBottom: 16, fontSize: 12, color: "#7C4A0A",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
              }}>
                <span>⏳ {grouped.pending.length} משתמשים ממתינים לאישור</span>
                <button onClick={() => setTab("pending")} style={{
                  padding: "4px 10px", fontSize: 11, fontWeight: 500,
                  background: "#7C4A0A", color: "#fff",
                  border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
                }}>
                  עבור לתצוגה ←
                </button>
              </div>
            )}
            <Section title="🛡 מנהלי-על"  list={grouped.admin}     color="#1A1A1A" onEdit={openEdit} onDelete={handleDelete} />
            <Section title="🔵 מנהל החינוך" list={grouped.education} color="#185FA5" onEdit={openEdit} onDelete={handleDelete} />
            <Section title="🟠 מחלקת הנוער" list={grouped.youth}     color="#D85A30" onEdit={openEdit} onDelete={handleDelete} />
          </>
        )}

        {showForm && editing && (
          <div style={modalBackdrop} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div style={modalBox}>
              <h2 style={{ fontSize: 17, fontWeight: 500, margin: "0 0 16px" }}>
                {editing.id ? "עריכת עובד" : "עובד חדש"}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="שם מלא *">
                  <input value={editing.full_name ?? ""} onChange={e => setEditing(p => ({ ...p!, full_name: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="כתובת מייל *">
                  <input type="email" value={editing.email ?? ""} onChange={e => setEditing(p => ({ ...p!, email: e.target.value }))} style={inputStyle} placeholder="user@ofakim.muni.il" />
                </Field>
                <Field label="תפקיד">
                  <select value={editing.role ?? "staff"} onChange={e => setEditing(p => ({ ...p!, role: e.target.value as "admin" | "staff" }))} style={{ ...inputStyle, background: "#fff" }}>
                    <option value="staff">עובד</option>
                    <option value="admin">מנהל-על</option>
                  </select>
                </Field>
                {editing.role === "staff" && (
                  <Field label="מחלקה *">
                    <select value={editing.department ?? "education"} onChange={e => setEditing(p => ({ ...p!, department: e.target.value as "education" | "youth" }))} style={{ ...inputStyle, background: "#fff" }}>
                      <option value="education">מנהל החינוך</option>
                      <option value="youth">מחלקת הנוער</option>
                    </select>
                  </Field>
                )}
                <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={editing.active ?? true} onChange={e => setEditing(p => ({ ...p!, active: e.target.checked }))} />
                  פעיל (יכול להתחבר)
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={handleSave} disabled={!editing.email || !editing.full_name} style={{
                  flex: 1, padding: "10px", fontSize: 14, fontWeight: 500,
                  background: editing.email && editing.full_name ? "#1A1A1A" : "var(--bg-secondary)",
                  color: editing.email && editing.full_name ? "#fff" : "var(--text-tertiary)",
                  border: "none", borderRadius: "var(--radius-md)",
                  cursor: editing.email && editing.full_name ? "pointer" : "not-allowed",
                }}>שמור</button>
                <button onClick={() => setShowForm(false)} style={{
                  padding: "10px 20px", fontSize: 14, background: "#fff",
                  border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)", cursor: "pointer",
                }}>בטל</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingSection({ list, onApprove, onEdit, onDelete }: {
  list: AppUser[]; onApprove: (id: string) => void;
  onEdit: (u: AppUser) => void; onDelete: (id: string) => void;
}) {
  return (
    <div style={{ marginBottom: 24, padding: "1rem 1.25rem",
      background: "linear-gradient(135deg, #FFF8EE 0%, #FAECE7 100%)",
      borderRadius: "var(--radius-lg)", border: "1px solid #F5C57E" }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "#7C4A0A",
        display: "flex", alignItems: "center", gap: 8 }}>
        ⏳ ממתינים לאישור <span style={{
          fontSize: 11, background: "#7C4A0A", color: "#fff",
          padding: "2px 8px", borderRadius: 10, fontWeight: 500 }}>
          {list.length}
        </span>
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map(u => (
          <div key={u.id} style={{
            background: "#fff", borderRadius: "var(--radius-md)",
            padding: "12px 14px", border: "0.5px solid var(--border)",
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: u.department === "education" ? "#E6F1FB" : "#FAECE7",
              color: u.department === "education" ? "#185FA5" : "#D85A30",
              fontSize: 14, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>{u.full_name[0]}</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{u.full_name}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {u.email} · ביקש להצטרף ל-{u.department === "education" ? "מנהל החינוך" : "מחלקת הנוער"}
              </div>
            </div>
            <button onClick={() => onApprove(u.id)} style={{
              padding: "7px 16px", fontSize: 12, fontWeight: 500,
              background: "var(--success)", color: "#fff",
              border: "none", borderRadius: "var(--radius-md)", cursor: "pointer",
            }}>✓ אישור</button>
            <button onClick={() => onEdit(u)} style={{
              padding: "7px 12px", fontSize: 12,
              background: "#fff", border: "0.5px solid var(--border)",
              borderRadius: "var(--radius-md)", cursor: "pointer",
            }}>✏️</button>
            <button onClick={() => onDelete(u.id)} style={{
              padding: "7px 12px", fontSize: 12,
              background: "#fff", color: "var(--danger)",
              border: "0.5px solid var(--border)",
              borderRadius: "var(--radius-md)", cursor: "pointer",
            }}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, list, color, onEdit, onDelete }: {
  title: string; list: AppUser[]; color: string;
  onEdit: (u: AppUser) => void; onDelete: (id: string) => void;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 12,
          background: color + "18", color,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          {title}
        </span>
        <span style={{
          fontSize: 11, padding: "2px 9px", borderRadius: 10,
          background: "var(--bg-secondary)", color: "var(--text-secondary)",
          fontWeight: 600,
        }}>
          {list.length}
        </span>
      </div>
      {list.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "16px", background: "#fff", borderRadius: 12, border: "0.5px dashed var(--border)", textAlign: "center" }}>
          אין עובדים במחלקה זו עדיין
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map(u => (
            <div key={u.id} style={{
              background: "#fff", borderRadius: 14,
              padding: "12px 16px", border: "1px solid rgba(0,0,0,0.04)",
              borderLeft: `4px solid ${color}`,
              display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateX(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.03)"; }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`,
                color, fontSize: 14, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, border: `1px solid ${color}33`,
              }}>{u.full_name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{u.full_name} {!u.active && <span style={{ fontSize: 10, color: "var(--danger)", fontWeight: 500 }}>(לא פעיל)</span>}</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>{u.email}</div>
              </div>
              <button onClick={() => onEdit(u)} style={smallBtn} title="ערוך">✏️</button>
              <button onClick={() => onDelete(u.id)} style={{ ...smallBtn, color: "var(--danger)" }} title="מחק">🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 11px", fontSize: 13,
  border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
  fontFamily: "inherit", outline: "none",
};
const smallBtn: React.CSSProperties = {
  width: 30, height: 30, border: "0.5px solid var(--border)",
  background: "#fff", borderRadius: "var(--radius-sm)",
  cursor: "pointer", fontSize: 13,
};
const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const modalBox: React.CSSProperties = {
  background: "#fff", borderRadius: "var(--radius-xl)",
  padding: "1.75rem", width: "100%", maxWidth: 420,
  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
};

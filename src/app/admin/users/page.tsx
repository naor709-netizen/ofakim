"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAllUsers, createUser, updateUser, deleteUser, loadSession, type AppUser } from "@/lib/auth";

export default function UsersAdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<AppUser> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [me, setMe] = useState<AppUser | null>(null);

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
        });
    if (result.error) { alert("שגיאה: " + result.error.message + "\n\nבדוק שהרצת את schema-auth.sql"); return; }
    setShowForm(false); setEditing(null);
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק את העובד? לא יוכל להתחבר יותר.")) return;
    await deleteUser(id);
    refresh();
  }

  const grouped = {
    admin:     users.filter(u => u.role === "admin"),
    education: users.filter(u => u.role === "staff" && u.department === "education"),
    youth:     users.filter(u => u.role === "staff" && u.department === "youth"),
  };

  if (!me) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#fafaf7" }}>
      <div style={{ background: "#1A1A1A", color: "#fff", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/admin" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 13 }}>→ דשבורד</Link>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
          <span style={{ fontSize: 15, fontWeight: 500 }}>ניהול עובדים</span>
        </div>
      </div>

      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px" }}>👥 עובדים מורשים</h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              {users.length} עובדים פעילים · רק עובדים מהרשימה הזו יוכלו להתחבר
            </p>
          </div>
          <button onClick={openCreate} style={{
            padding: "9px 18px", fontSize: 13, fontWeight: 500,
            background: "#1A1A1A", color: "#fff",
            border: "none", borderRadius: "var(--radius-md)", cursor: "pointer",
          }}>
            + עובד חדש
          </button>
        </div>

        {loading ? <p>טוען...</p> : (
          <>
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

function Section({ title, list, color, onEdit, onDelete }: {
  title: string; list: AppUser[]; color: string;
  onEdit: (u: AppUser) => void; onDelete: (id: string) => void;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px", color }}>{title} <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>({list.length})</span></h3>
      {list.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "12px 14px", background: "#fff", borderRadius: "var(--radius-md)", border: "0.5px solid var(--border)" }}>
          אין עובדים במחלקה זו
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {list.map(u => (
            <div key={u.id} style={{
              background: "#fff", borderRadius: "var(--radius-md)",
              padding: "10px 14px", border: "0.5px solid var(--border)",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: color + "22", color, fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>{u.full_name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{u.full_name} {!u.active && <span style={{ fontSize: 10, color: "var(--danger)" }}>(לא פעיל)</span>}</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{u.email}</div>
              </div>
              <button onClick={() => onEdit(u)} style={smallBtn}>✏️</button>
              <button onClick={() => onDelete(u.id)} style={{ ...smallBtn, color: "var(--danger)" }}>🗑</button>
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

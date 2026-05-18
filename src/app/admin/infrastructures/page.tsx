"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getInfrastructures, createInfrastructure, updateInfrastructure, deleteInfrastructure,
  type Infrastructure,
} from "@/lib/infrastructure";
import { TopBar } from "@/components/v3/TopBar";

const INFRA_TYPES = ["אולם", "מועדון", "אולם ספורט", "בית ספר", "גן", "מרחב חוץ", "אחר"];

const TYPE_STYLE: Record<string, { emoji: string; accent: string; bg: string }> = {
  "אולם":        { emoji: "🎭", accent: "#7F77DD", bg: "linear-gradient(135deg, #EEEDFE 0%, #C7C4F5 100%)" },
  "מועדון":      { emoji: "🎪", accent: "#D85A30", bg: "linear-gradient(135deg, #FAECE7 0%, #F5C4B3 100%)" },
  "אולם ספורט":  { emoji: "🏀", accent: "#0F6E56", bg: "linear-gradient(135deg, #E1F5EE 0%, #9FE1CB 100%)" },
  "בית ספר":     { emoji: "🏫", accent: "#185FA5", bg: "linear-gradient(135deg, #E6F1FB 0%, #B5D4F4 100%)" },
  "גן":           { emoji: "🌳", accent: "#1D9E75", bg: "linear-gradient(135deg, #E1F5EE 0%, #9FE1CB 100%)" },
  "מרחב חוץ":    { emoji: "🌅", accent: "#7C4A0A", bg: "linear-gradient(135deg, #FFF8EE 0%, #F5C57E 100%)" },
  "אחר":          { emoji: "📍", accent: "#5F5E5A", bg: "linear-gradient(135deg, #F4F4F1 0%, #E5E5E0 100%)" },
};

export default function InfrastructuresPage() {
  const [items, setItems] = useState<Infrastructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Infrastructure | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setItems(await getInfrastructures());
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק את התשתית?")) return;
    const { error } = await deleteInfrastructure(id);
    if (error) { alert("שגיאה: " + error.message); return; }
    refresh();
  }

  function openCreate() {
    setEditing({
      id: "", name: "", type: "אולם", address: "", contact_name: "", contact_phone: "",
      capacity: null, age_range: "", description: "", active: true,
    });
    setShowForm(true);
  }

  function openEdit(infra: Infrastructure) {
    setEditing(infra);
    setShowForm(true);
  }

  async function handleSave() {
    if (!editing) return;
    const payload = {
      name: editing.name, type: editing.type,
      address: editing.address, contact_name: editing.contact_name,
      contact_phone: editing.contact_phone, capacity: editing.capacity,
      age_range: editing.age_range, description: editing.description, active: editing.active,
    };
    const result = editing.id
      ? await updateInfrastructure(editing.id, payload)
      : await createInfrastructure({ ...payload, name: editing.name, type: editing.type });
    if (result.error) { alert("שגיאה: " + result.error.message + "\n\nבדוק שהרצת את schema-extras.sql"); return; }
    setShowForm(false); setEditing(null);
    refresh();
  }

  const filtered = items.filter(i =>
    !search || i.name.includes(search) || (i.address?.includes(search) ?? false)
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <TopBar
        variant="admin"
        title="מאגר תשתיות"
        subtitle="VENUES · INFRASTRUCTURE"
        rightContent={
          <Link href="/admin" style={{
            color: "rgba(255,255,255,0.85)", textDecoration: "none",
            fontSize: 12, padding: "6px 12px",
            background: "rgba(255,255,255,0.15)", borderRadius: 8,
          }}>← דשבורד</Link>
        }
      />

      <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>

        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg, #1D9E75 0%, #185FA5 60%, #7F77DD 100%)",
          borderRadius: 22, padding: "1.5rem 2rem",
          marginBottom: 20, position: "relative", overflow: "hidden",
          color: "#fff",
        }}>
          <div style={{ position: "absolute", bottom: -50, left: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.12)", filter: "blur(40px)" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, opacity: 0.85, textTransform: "uppercase" }}>
                🏛 VENUES · INFRASTRUCTURE
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: "6px 0 4px", letterSpacing: -0.3 }}>
                מאגר תשתיות עירוני
              </h1>
              <p style={{ fontSize: 13, margin: 0, opacity: 0.92 }}>
                {items.length} מקומות פעילים · עיריית אופקים
              </p>
            </div>
            <button onClick={openCreate} style={{
              padding: "10px 20px", fontSize: 13, fontWeight: 600,
              background: "rgba(255,255,255,0.95)", color: "#0F6E56",
              border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              + תשתית חדשה
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם או כתובת..."
          style={{
            width: "100%", padding: "9px 12px", fontSize: 13,
            border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
            background: "#fff", marginBottom: 16, outline: "none", fontFamily: "inherit",
          }}
        />

        {/* Grid */}
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-tertiary)" }}>טוען...</p>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", padding: "3rem", textAlign: "center", border: "0.5px solid var(--border)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏗</div>
            <p style={{ color: "var(--text-secondary)" }}>אין תשתיות עדיין. לחץ "תשתית חדשה" כדי להוסיף.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {filtered.map(infra => {
              const style = TYPE_STYLE[infra.type] || TYPE_STYLE["אחר"];
              return (
                <div key={infra.id} style={{
                  background: "#fff", borderRadius: 16,
                  padding: 0, border: "1px solid rgba(0,0,0,0.04)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  overflow: "hidden",
                  transition: "transform 0.15s, box-shadow 0.15s",
                  display: "flex", flexDirection: "column",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
                >
                  {/* Banner צבעוני */}
                  <div style={{
                    background: style.bg, padding: "12px 16px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 26 }}>{style.emoji}</span>
                      <span style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 10,
                        background: "rgba(255,255,255,0.7)", color: style.accent,
                        fontWeight: 600, backdropFilter: "blur(4px)",
                      }}>
                        {infra.type}
                      </span>
                    </div>
                    {!infra.active && (
                      <span style={{ fontSize: 10, color: "var(--danger)", fontWeight: 600, background: "rgba(255,255,255,0.85)", padding: "2px 8px", borderRadius: 8 }}>
                        לא פעיל
                      </span>
                    )}
                  </div>

                  {/* תוכן */}
                  <div style={{ padding: "12px 16px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px", color: style.accent }}>{infra.name}</h3>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                      {infra.address       && <div>📍 {infra.address}</div>}
                      {infra.capacity      && <div>👥 קיבולת: {infra.capacity}</div>}
                      {infra.contact_name  && <div>📞 {infra.contact_name}{infra.contact_phone ? ` · ${infra.contact_phone}` : ""}</div>}
                      {infra.description   && <div style={{ marginTop: 4, fontStyle: "italic", color: "var(--text-tertiary)" }}>{infra.description}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                      <button onClick={() => openEdit(infra)} style={{ ...smallBtn(style.accent, "#fff"), flex: 1 }}>✏️ ערוך</button>
                      <button onClick={() => handleDelete(infra.id)} style={smallBtn("#fff", "var(--danger)")}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Form modal */}
        {showForm && editing && (
          <div style={modalBackdrop} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div style={modalBox}>
              <h2 style={{ fontSize: 17, margin: "0 0 16px", fontWeight: 500 }}>
                {editing.id ? "עריכת תשתית" : "תשתית חדשה"}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Field label="שם המקום *">
                  <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={inputStyle} />
                </Field>
                <Field label="סוג">
                  <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })} style={{ ...inputStyle, background: "#fff" }}>
                    {INFRA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="כתובת">
                  <input value={editing.address ?? ""} onChange={e => setEditing({ ...editing, address: e.target.value })} style={inputStyle} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="איש קשר">
                    <input value={editing.contact_name ?? ""} onChange={e => setEditing({ ...editing, contact_name: e.target.value })} style={inputStyle} />
                  </Field>
                  <Field label="טלפון">
                    <input value={editing.contact_phone ?? ""} onChange={e => setEditing({ ...editing, contact_phone: e.target.value })} style={inputStyle} />
                  </Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="קיבולת (אנשים)">
                    <input type="number" value={editing.capacity ?? ""} onChange={e => setEditing({ ...editing, capacity: e.target.value ? Number(e.target.value) : null })} style={inputStyle} />
                  </Field>
                  <Field label="טווח גילאים">
                    <input value={editing.age_range ?? ""} onChange={e => setEditing({ ...editing, age_range: e.target.value })} placeholder="למשל: 12-18" style={inputStyle} />
                  </Field>
                </div>
                <Field label="תיאור">
                  <textarea value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                </Field>
                <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} />
                  פעיל
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={handleSave} disabled={!editing.name} style={{
                  flex: 1, padding: "10px", fontSize: 14, fontWeight: 500,
                  background: editing.name ? "#1A1A1A" : "var(--bg-secondary)",
                  color: editing.name ? "#fff" : "var(--text-tertiary)",
                  border: "none", borderRadius: "var(--radius-md)", cursor: editing.name ? "pointer" : "not-allowed",
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
const smallBtn = (bg: string, fg: string): React.CSSProperties => ({
  padding: "5px 10px", fontSize: 11, fontFamily: "inherit",
  background: bg, color: fg,
  border: "0.5px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer",
});
const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const modalBox: React.CSSProperties = {
  background: "#fff", borderRadius: "var(--radius-xl)",
  padding: "1.75rem", width: "100%", maxWidth: 460,
  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  maxHeight: "90vh", overflowY: "auto",
};

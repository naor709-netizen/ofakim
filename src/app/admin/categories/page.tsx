"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  type DbCategory, type CategoryDept,
} from "@/lib/events";
import { loadSession } from "@/lib/auth";
import { TopBar } from "@/components/v3/TopBar";
import { useToast } from "@/components/Toast";

const PRESET_COLORS = [
  "#1D9E75", "#185FA5", "#7F77DD", "#D4537E", "#888780",
  "#5F5E5A", "#BA7517", "#E8B454", "#D85A30", "#639922",
  "#885511", "#993C1D", "#0C447C", "#1A1A1A",
];

const DEPT_LABEL: Record<CategoryDept, string> = {
  education: "מנהל החינוך",
  youth:     "מחלקת הנוער",
  both:      "שתי המחלקות (משותף)",
};

const DEPT_BADGE: Record<CategoryDept, { bg: string; fg: string }> = {
  education: { bg: "#E6F1FB", fg: "#185FA5" },
  youth:     { bg: "#FAECE7", fg: "#D85A30" },
  both:      { bg: "#EEEDFE", fg: "#7F77DD" },
};

type EditingCat = {
  id: string;
  name: string;
  department: CategoryDept;
  color: string;
  display_order: number;
};

export default function CategoriesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingCat | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (!session || session.role !== "admin") {
      router.push("/login");
      return;
    }
    refresh();
  }, [router]);

  async function refresh() {
    setLoading(true);
    setItems(await getCategories());
    setLoading(false);
  }

  function openCreate() {
    setEditing({
      id: "", name: "", department: "education",
      color: PRESET_COLORS[0], display_order: items.length + 1,
    });
    setShowForm(true);
  }

  function openEdit(cat: DbCategory) {
    setEditing({
      id: cat.id, name: cat.name, department: cat.department,
      color: cat.color, display_order: cat.display_order,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);
    const payload = {
      name: editing.name.trim(),
      department: editing.department,
      color: editing.color,
      display_order: editing.display_order,
    };
    const result = editing.id
      ? await updateCategory(editing.id, payload)
      : await createCategory(payload);
    setSaving(false);
    if (result.error) {
      toast("שגיאה: " + result.error.message, "error");
      return;
    }
    toast(editing.id ? "התחום עודכן ✨" : "התחום נוסף ✨", "success");
    setShowForm(false);
    setEditing(null);
    refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`למחוק את התחום "${name}"? אירועים שמשויכים אליו יישברו!`)) return;
    const { error } = await deleteCategory(id);
    if (error) {
      toast("שגיאה: " + error.message + " — ייתכן שיש אירועים משויכים", "error");
      return;
    }
    toast("התחום נמחק", "success");
    refresh();
  }

  const byDept = {
    education: items.filter(i => i.department === "education"),
    youth:     items.filter(i => i.department === "youth"),
    both:      items.filter(i => i.department === "both"),
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <TopBar
        variant="admin"
        title="ניהול תחומים"
        subtitle="CATEGORIES · ADMIN"
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
          background: "linear-gradient(135deg, #BE185D 0%, #D85A30 50%, #E8B454 100%)",
          borderRadius: 22, padding: "1.5rem 2rem",
          marginBottom: 20, position: "relative", overflow: "hidden",
          color: "#fff",
        }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.12)", filter: "blur(40px)" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, opacity: 0.85, textTransform: "uppercase" }}>
                🏷 CATEGORIES
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: "6px 0 4px", letterSpacing: -0.3 }}>
                ניהול תחומים
              </h1>
              <p style={{ fontSize: 13, margin: 0, opacity: 0.92 }}>
                {items.length} תחומים · אפשר ליצור תחום משותף לשתי המחלקות
              </p>
            </div>
            <button onClick={openCreate} style={{
              padding: "10px 20px", fontSize: 13, fontWeight: 600,
              background: "rgba(255,255,255,0.95)", color: "#BE185D",
              border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              + תחום חדש
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-tertiary)" }}>טוען...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {(["both", "education", "youth"] as CategoryDept[]).map(dept => {
              const list = byDept[dept];
              if (list.length === 0 && dept !== "both") return null;
              return (
                <section key={dept}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                  }}>
                    <span style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 10,
                      background: DEPT_BADGE[dept].bg, color: DEPT_BADGE[dept].fg,
                      fontWeight: 500,
                    }}>
                      {DEPT_LABEL[dept]}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                      · {list.length} תחומים
                    </span>
                  </div>
                  {list.length === 0 ? (
                    <p style={{
                      fontSize: 13, color: "var(--text-tertiary)", margin: 0,
                      padding: "16px", background: "#fff",
                      borderRadius: "var(--radius-md)", border: "0.5px dashed var(--border)",
                    }}>
                      אין עדיין תחומים משותפים. צור תחום חדש ובחר &quot;{DEPT_LABEL.both}&quot;.
                    </p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                      {list.map(cat => (
                        <div key={cat.id} style={{
                          background: "#fff", borderRadius: "var(--radius-lg)",
                          padding: "1rem 1.25rem", border: "0.5px solid var(--border)",
                          borderLeft: `4px solid ${cat.color}`,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ width: 14, height: 14, borderRadius: 3, background: cat.color, flexShrink: 0 }} />
                              <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{cat.name}</h3>
                            </div>
                            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>#{cat.display_order}</span>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => openEdit(cat)} style={smallBtn("#1A1A1A", "#fff")}>✏️ ערוך</button>
                            <button onClick={() => handleDelete(cat.id, cat.name)} style={smallBtn("#fff", "var(--danger)")}>🗑 מחק</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {showForm && editing && (
          <div style={modalBackdrop} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div style={modalBox}>
              <h2 style={{ fontSize: 17, margin: "0 0 16px", fontWeight: 500 }}>
                {editing.id ? "עריכת תחום" : "תחום חדש"}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="שם התחום *">
                  <input
                    value={editing.name}
                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                    placeholder="למשל: תנועות נוער"
                    style={inputStyle}
                  />
                </Field>

                <Field label="שייך למחלקה *">
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(["education", "youth", "both"] as CategoryDept[]).map(d => (
                      <label key={d} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", borderRadius: "var(--radius-md)",
                        background: editing.department === d ? DEPT_BADGE[d].bg : "#fff",
                        border: `1px solid ${editing.department === d ? DEPT_BADGE[d].fg : "var(--border)"}`,
                        cursor: "pointer", fontSize: 13,
                        color: editing.department === d ? DEPT_BADGE[d].fg : "var(--text-primary)",
                        fontWeight: editing.department === d ? 500 : 400,
                      }}>
                        <input
                          type="radio"
                          name="dept"
                          value={d}
                          checked={editing.department === d}
                          onChange={() => setEditing({ ...editing, department: d })}
                          style={{ accentColor: DEPT_BADGE[d].fg }}
                        />
                        {DEPT_LABEL[d]}
                        {d === "both" && (
                          <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginRight: "auto" }}>
                            יופיע אצל שני הצוותים
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </Field>

                <Field label="צבע *">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 8 }}>
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditing({ ...editing, color: c })}
                        style={{
                          width: "100%", aspectRatio: "1",
                          background: c, border: editing.color === c ? "3px solid #1A1A1A" : "0.5px solid var(--border)",
                          borderRadius: 6, cursor: "pointer",
                        }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={editing.color}
                    onChange={e => setEditing({ ...editing, color: e.target.value })}
                    style={{
                      width: "100%", height: 34, padding: 2,
                      border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
                      cursor: "pointer", background: "#fff",
                    }}
                  />
                </Field>

                <Field label="סדר תצוגה">
                  <input
                    type="number"
                    value={editing.display_order}
                    onChange={e => setEditing({ ...editing, display_order: Number(e.target.value) || 0 })}
                    style={inputStyle}
                  />
                </Field>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={handleSave} disabled={!editing.name.trim() || saving} style={{
                  flex: 1, padding: "10px", fontSize: 14, fontWeight: 500,
                  background: editing.name.trim() ? "#1A1A1A" : "var(--bg-secondary)",
                  color: editing.name.trim() ? "#fff" : "var(--text-tertiary)",
                  border: "none", borderRadius: "var(--radius-md)",
                  cursor: editing.name.trim() ? "pointer" : "not-allowed",
                }}>
                  {saving ? "שומר..." : "שמור"}
                </button>
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
  maxHeight: "92vh", overflowY: "auto",
};

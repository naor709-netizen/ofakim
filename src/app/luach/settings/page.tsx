"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadProfile, saveProfile, clearProfile, INTEREST_AREAS, GRADES, type ParentProfile, type Child } from "@/lib/parent";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    if (!p) { router.push("/luach/onboarding"); return; }
    setProfile(p);
  }, [router]);

  if (!profile) return null;

  function update<K extends keyof ParentProfile>(key: K, value: ParentProfile[K]) {
    if (!profile) return;
    setProfile({ ...profile, [key]: value });
  }

  function handleSave() {
    if (!profile) return;
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    if (!confirm("לאפס את הפרופיל ולהתחיל מחדש?")) return;
    clearProfile();
    router.push("/luach/onboarding");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fafaf7", padding: "16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <Link href="/luach/my" style={{ fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none" }}>
          → חזרה ללוח האישי
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "8px 0 24px", color: "#04342C" }}>
          ⚙️ הגדרות
        </h1>

        <Section title="פרטי משפחה">
          <Field label="שם משפחה">
            <input value={profile.familyName} onChange={e => update("familyName", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="שכונה">
            <input value={profile.neighborhood} onChange={e => update("neighborhood", e.target.value)} style={inputStyle} />
          </Field>
        </Section>

        <Section title="ילדים">
          {profile.children.map((child, i) => (
            <div key={child.id} style={{
              background: "var(--bg-secondary)", borderRadius: "var(--radius-md)",
              padding: 12, marginBottom: 8, display: "flex", gap: 8, alignItems: "flex-end",
            }}>
              <input
                value={child.name}
                onChange={e => update("children", profile.children.map(c => c.id === child.id ? { ...c, name: e.target.value } : c))}
                placeholder="שם"
                style={{ ...inputStyle, flex: 1.5 }}
              />
              <select
                value={child.grade}
                onChange={e => update("children", profile.children.map(c => c.id === child.id ? { ...c, grade: e.target.value } : c))}
                style={{ ...inputStyle, flex: 1, background: "#fff" }}
              >
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              {profile.children.length > 1 && (
                <button onClick={() => update("children", profile.children.filter(c => c.id !== child.id))}
                  style={{ width: 36, height: 36, border: "none", background: "#fff", borderRadius: "var(--radius-md)", cursor: "pointer", color: "var(--danger)" }}>×</button>
              )}
            </div>
          ))}
          <button onClick={() => update("children", [...profile.children, { id: String(Date.now()), name: "", grade: "א'" }])}
            style={{ width: "100%", padding: 10, fontSize: 13, background: "var(--parent-lighter)", color: "var(--parent-primary-dark)", border: "1px dashed var(--parent-light)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
            + הוסף ילד
          </button>
        </Section>

        <Section title="תחומי עניין">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {INTEREST_AREAS.map(area => {
              const active = profile.interests.includes(area.id);
              return (
                <button key={area.id} onClick={() => update("interests", active ? profile.interests.filter(i => i !== area.id) : [...profile.interests, area.id])}
                  style={{
                    padding: "10px 12px", fontSize: 13, fontFamily: "inherit", textAlign: "right",
                    borderRadius: "var(--radius-md)",
                    border: active ? "1.5px solid var(--parent-primary)" : "0.5px solid var(--border)",
                    background: active ? "var(--parent-lighter)" : "#fff",
                    color: active ? "var(--parent-primary-dark)" : "var(--text-primary)",
                    cursor: "pointer", display: "flex", gap: 8, alignItems: "center",
                  }}>
                  <span>{area.icon}</span>{area.label}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="התראות">
          {[
            { id: "whatsapp",    label: "וואטסאפ" },
            { id: "emailWeekly", label: "אימייל שבועי" },
            { id: "reminders",   label: "תזכורות יום לפני" },
          ].map(opt => (
            <label key={opt.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 13 }}>
              <input type="checkbox"
                checked={profile.notifications[opt.id as keyof typeof profile.notifications]}
                onChange={e => update("notifications", { ...profile.notifications, [opt.id]: e.target.checked })}
                style={{ accentColor: "var(--parent-primary)" }}
              />
              {opt.label}
            </label>
          ))}
        </Section>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={handleSave} style={{
            flex: 1, padding: "12px", fontSize: 14, fontWeight: 500,
            background: saved ? "var(--success)" : "var(--parent-primary)",
            color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer",
          }}>
            {saved ? "✓ נשמר!" : "שמור שינויים"}
          </button>
          <button onClick={handleReset} style={{
            padding: "12px 16px", fontSize: 13,
            background: "#fff", color: "var(--danger)",
            border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)", cursor: "pointer",
          }}>
            איפוס פרופיל
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem", border: "0.5px solid var(--border)", marginBottom: 14 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px", color: "var(--parent-primary-darker)" }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
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

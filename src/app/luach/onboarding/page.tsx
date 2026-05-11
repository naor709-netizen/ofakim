"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GRADES, INTEREST_AREAS, saveProfile, getParentUser, type Child } from "@/lib/parent";

export default function OnboardingPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [step, setStep] = useState(1);

  useEffect(() => {
    getParentUser().then(user => {
      if (!user) { router.replace("/luach/login"); return; }
      setAuthChecking(false);
    });
  }, [router]);
  const [familyName, setFamilyName]     = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [children, setChildren]         = useState<Child[]>([{ id: "1", name: "", grade: "א'" }]);
  const [interests, setInterests]       = useState<string[]>([]);
  const [notif, setNotif] = useState({ whatsapp: true, emailWeekly: true, reminders: false });
  const [phone, setPhone] = useState("");

  const totalSteps = 4;

  function addChild() {
    setChildren(c => [...c, { id: String(Date.now()), name: "", grade: "א'" }]);
  }
  function updateChild(id: string, patch: Partial<Child>) {
    setChildren(c => c.map(ch => ch.id === id ? { ...ch, ...patch } : ch));
  }
  function removeChild(id: string) {
    setChildren(c => c.length > 1 ? c.filter(ch => ch.id !== id) : c);
  }
  function toggleInterest(id: string) {
    setInterests(i => i.includes(id) ? i.filter(x => x !== id) : [...i, id]);
  }

  async function finish() {
    setSaveError("");
    const { error } = await saveProfile({
      familyName, neighborhood, children, interests,
      notifications: notif, phone,
    });
    if (error) { setSaveError("שגיאה בשמירה: " + error); return; }
    router.push("/luach/my");
  }

  const canNext =
    (step === 1 && familyName.trim().length > 0) ||
    (step === 2 && children.some(c => c.name.trim().length > 0)) ||
    (step === 3 && interests.length > 0) ||
    step === 4;

  if (authChecking) {
    return (
      <div style={{ minHeight: "100vh", background: "#fafaf7", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>🔐 בודק...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fafaf7", padding: "24px 16px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Link href="/luach" style={{ fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none" }}>
            → חזרה ללוח
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: "8px 0 4px", color: "#04342C" }}>
            ברוכים הבאים ללוח אופקים 🌟
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            סקר קצר (דקה) — ונסנן לכם את הלוח לפי הילדים שלכם
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i < step ? "var(--parent-primary)" : "#E5E5E0",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: "#fff", borderRadius: "var(--radius-xl)",
          padding: "1.75rem 1.5rem",
          border: "0.5px solid var(--border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}>

          {/* Step 1 - Family */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 6px", color: "var(--parent-primary-darker)" }}>
                נכיר רגע 👋
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 20px" }}>
                איך לקרוא לכם בלוח?
              </p>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                שם המשפחה *
              </label>
              <input
                value={familyName}
                onChange={e => setFamilyName(e.target.value)}
                placeholder="למשל: כהן"
                style={inputStyle}
              />
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", margin: "16px 0 6px" }}>
                שכונה (אופציונלי)
              </label>
              <input
                value={neighborhood}
                onChange={e => setNeighborhood(e.target.value)}
                placeholder="למשל: שכונת רמב״ם"
                style={inputStyle}
              />
            </>
          )}

          {/* Step 2 - Children */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 6px", color: "var(--parent-primary-darker)" }}>
                הילדים שלכם 👶
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 20px" }}>
                כדי שנציג לכם רק אירועים שמתאימים להם
              </p>
              {children.map((child, idx) => (
                <div key={child.id} style={{
                  background: "var(--bg-secondary)", borderRadius: "var(--radius-md)",
                  padding: "12px 14px", marginBottom: 10,
                  display: "flex", gap: 10, alignItems: "flex-end",
                }}>
                  <div style={{ flex: 1.5 }}>
                    <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>
                      ילד/ה {idx + 1}
                    </label>
                    <input
                      value={child.name}
                      onChange={e => updateChild(child.id, { name: e.target.value })}
                      placeholder="שם פרטי"
                      style={{ ...inputStyle, padding: "7px 10px", fontSize: 13 }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>
                      כיתה
                    </label>
                    <select
                      value={child.grade}
                      onChange={e => updateChild(child.id, { grade: e.target.value })}
                      style={{ ...inputStyle, padding: "7px 10px", fontSize: 13, background: "#fff" }}
                    >
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  {children.length > 1 && (
                    <button onClick={() => removeChild(child.id)} style={{
                      width: 32, height: 32, border: "none",
                      background: "#fff", borderRadius: "var(--radius-md)",
                      cursor: "pointer", color: "var(--danger)", fontSize: 16,
                    }}>×</button>
                  )}
                </div>
              ))}
              <button onClick={addChild} style={{
                width: "100%", padding: "10px", fontSize: 13,
                background: "var(--parent-lighter)", color: "var(--parent-primary-dark)",
                border: "1px dashed var(--parent-light)", borderRadius: "var(--radius-md)",
                cursor: "pointer", fontWeight: 500,
              }}>
                + הוסף ילד נוסף
              </button>
            </>
          )}

          {/* Step 3 - Interests */}
          {step === 3 && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 6px", color: "var(--parent-primary-darker)" }}>
                מה מעניין אתכם? 🎯
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 20px" }}>
                בחרו כמה שתרצו — נציג לכם אירועים בתחומים האלה
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {INTEREST_AREAS.map(area => {
                  const active = interests.includes(area.id);
                  return (
                    <button key={area.id} onClick={() => toggleInterest(area.id)} style={{
                      padding: "12px 10px", fontSize: 13, fontFamily: "inherit",
                      borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "right",
                      border: active ? "1.5px solid var(--parent-primary)" : "0.5px solid var(--border)",
                      background: active ? "var(--parent-lighter)" : "#fff",
                      color: active ? "var(--parent-primary-dark)" : "var(--text-primary)",
                      fontWeight: active ? 500 : 400,
                      display: "flex", alignItems: "center", gap: 8,
                      transition: "all 0.15s",
                    }}>
                      <span style={{ fontSize: 18 }}>{area.icon}</span>
                      <span>{area.label}</span>
                      {active && <span style={{ marginRight: "auto", color: "var(--parent-primary)" }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 4 - Notifications */}
          {step === 4 && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 6px", color: "var(--parent-primary-darker)" }}>
                איך תרצו לקבל עדכונים? 🔔
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 20px" }}>
                נשלח לכם רק על מה שרלוונטי לכם — אפשר תמיד לכבות אחר כך
              </p>

              {[
                { id: "whatsapp",    label: "התראות בוואטסאפ",  desc: "כשיש אירוע חדש שמתאים לילדים שלכם" },
                { id: "emailWeekly", label: "סיכום שבועי באימייל", desc: "כל יום ראשון בבוקר — מה צפוי השבוע" },
                { id: "reminders",   label: "תזכורות יום לפני",  desc: "התראה ערב לפני אירוע" },
              ].map(opt => {
                const checked = notif[opt.id as keyof typeof notif];
                return (
                  <label key={opt.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "12px 14px", marginBottom: 8,
                    background: checked ? "var(--parent-lighter)" : "var(--bg-secondary)",
                    borderRadius: "var(--radius-md)", cursor: "pointer",
                    border: checked ? "1px solid var(--parent-light)" : "1px solid transparent",
                    transition: "all 0.15s",
                  }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => setNotif(n => ({ ...n, [opt.id]: e.target.checked }))}
                      style={{ marginTop: 2, accentColor: "var(--parent-primary)" }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{opt.desc}</div>
                    </div>
                  </label>
                );
              })}

              {(notif.whatsapp || notif.reminders) && (
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="מספר טלפון לוואטסאפ"
                  style={{ ...inputStyle, marginTop: 8 }}
                />
              )}
            </>
          )}
        </div>

        {saveError && (
          <div style={{ marginTop: 12, padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "var(--radius-md)", fontSize: 12, color: "#991B1B" }}>
            {saveError}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} style={{
              padding: "10px 20px", fontSize: 14, borderRadius: "var(--radius-md)",
              background: "#fff", border: "0.5px solid var(--border)",
              cursor: "pointer", color: "var(--text-secondary)",
            }}>
              → אחורה
            </button>
          )}
          <button
            onClick={() => step < totalSteps ? setStep(step + 1) : finish()}
            disabled={!canNext}
            style={{
              flex: 1, padding: "10px 20px", fontSize: 14, fontWeight: 500,
              borderRadius: "var(--radius-md)", border: "none",
              background: canNext ? "var(--parent-primary)" : "var(--bg-secondary)",
              color:      canNext ? "#fff" : "var(--text-tertiary)",
              cursor: canNext ? "pointer" : "not-allowed",
            }}
          >
            {step < totalSteps ? "המשך ←" : "סיום ולוח אישי 🎉"}
          </button>
        </div>

        {/* Skip */}
        {step < totalSteps && (
          <p style={{ textAlign: "center", marginTop: 14 }}>
            <Link href="/luach" style={{ fontSize: 12, color: "var(--text-tertiary)", textDecoration: "none" }}>
              דלג — קח אותי ללוח הכללי
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", fontSize: 14,
  border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)",
  fontFamily: "inherit", outline: "none",
};

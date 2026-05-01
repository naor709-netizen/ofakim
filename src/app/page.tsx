import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#fafaf7", padding: "40px 20px" }}>
      <div style={{ maxWidth: 460, margin: "0 auto" }}>

        {/* כותרת */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: "0 0 8px", color: "var(--text-primary)" }}>
            פורטל הגאנט – אופקים
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
            לוח אירועים שנתי של מנהל החינוך ומחלקת הנוער
          </p>
        </div>

        {/* כניסת עובדים */}
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "0 0 12px", paddingRight: 4 }}>
          כניסת עובדים
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: "1.75rem" }}>

          {/* מנהל החינוך */}
          <Link href="/login?dept=education" style={{ textDecoration: "none" }}>
            <div className="landing-card" style={{
              background: "var(--education-lighter)",
              padding: "1.5rem 1.25rem",
              borderRadius: "var(--radius-lg)",
              border: "0.5px solid var(--border)",
              cursor: "pointer",
              textAlign: "right",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--education-light)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0C447C" strokeWidth="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </div>
              <p style={{ fontSize: 17, fontWeight: 500, margin: "0 0 4px", color: "#0C447C" }}>
                מנהל החינוך
              </p>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, color: "var(--education-primary)" }}>
                גיל הרך, יסודי, על-יסודי, קייטנות, חינוך חרדי, הכשרות
              </p>
            </div>
          </Link>

          {/* מחלקת הנוער */}
          <Link href="/login?dept=youth" style={{ textDecoration: "none" }}>
            <div className="landing-card" style={{
              background: "#FAEEDA",
              padding: "1.5rem 1.25rem",
              borderRadius: "var(--radius-lg)",
              border: "0.5px solid var(--border)",
              cursor: "pointer",
              textAlign: "right",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "#FAC775",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#633806" strokeWidth="2">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>
                </svg>
              </div>
              <p style={{ fontSize: 17, fontWeight: 500, margin: "0 0 4px", color: "#633806" }}>
                מחלקת הנוער
              </p>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, color: "var(--youth-primary-dark)" }}>
                תנועת חלום, מעורבות חברתית, שירות משמעותי, תנועות נוער
              </p>
            </div>
          </Link>
        </div>

        {/* מפריד */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 1rem" }}>
          <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>או</span>
          <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
        </div>

        {/* לוח ציבורי */}
        <Link href="/luach" style={{ textDecoration: "none" }}>
          <div className="landing-card" style={{
            background: "var(--parent-lighter)",
            padding: "1.75rem",
            borderRadius: "var(--radius-lg)",
            border: "0.5px solid var(--border)",
            cursor: "pointer",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--parent-light)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 12,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#085041" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                </div>
                <p style={{ fontSize: 17, fontWeight: 500, margin: "0 0 4px", color: "#085041" }}>
                  לוח אירועים לתושבים
                </p>
                <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, color: "var(--parent-primary-dark)" }}>
                  צפייה ציבורית בלוח השנתי של חינוך ונוער אופקים
                </p>
              </div>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "var(--parent-light)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#085041", fontSize: 18, flexShrink: 0,
              }}>
                ←
              </div>
            </div>
          </div>
        </Link>

        {/* דשבורד מנהלי */}
        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 8px" }}>
            <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>ניהול</span>
            <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
          </div>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <div className="landing-card" style={{
              background: "#F5F5F3", padding: "1rem 1.25rem",
              borderRadius: "var(--radius-md)", border: "0.5px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#E5E5E0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                  </svg>
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#333" }}>דשבורד מנהלי</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>← כניסה</span>
            </div>
          </Link>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-tertiary)", marginTop: "1.5rem" }}>
          עיריית אופקים · תשפ״ו
        </p>
      </div>

      <style>{`
        .landing-card { transition: transform 0.15s, border-color 0.15s; display: block; }
        .landing-card:hover { transform: translateY(-2px); }
      `}</style>
    </div>
  );
}

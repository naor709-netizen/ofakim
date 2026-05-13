"use client";

import { useState } from "react";
import { parseICS, type IcsEvent } from "@/lib/ics";

type Category = { id: string; name: string; color: string };

export type IcsImportPayload = {
  name: string;
  category_id: string;
  start_month: number;
  end_month: number;
  start_day: number;
  end_day: number;
  start_year: number;
  end_year: number;
  age_groups: string[];
  location: string | null;
  responsible: string | null;
};

type Row = IcsEvent & {
  rowId: string;
  selected: boolean;
  categoryId: string;
  customName: string;
};

type ModalProps = {
  open: boolean;
  onClose: () => void;
  fileText: string;
  fileName: string;
  categories: Category[];
  defaultCategoryId: string;
  onImport: (events: IcsImportPayload[]) => Promise<{ ok: number; failed: number }>;
  primary: string;
  primaryDark: string;
  lighter: string;
  light: string;
};

export function IcsImportModal(props: ModalProps) {
  if (!props.open) return null;
  return <IcsImportModalInner {...props} />;
}

function IcsImportModalInner({
  onClose,
  fileText,
  fileName,
  categories,
  defaultCategoryId,
  onImport,
  primary,
  primaryDark,
  lighter,
  light,
}: ModalProps) {
  const [{ rows, error }, setState] = useState<{ rows: Row[]; error: string | null }>(() => {
    if (!fileText) return { rows: [], error: null };
    try {
      const parsed = parseICS(fileText);
      if (parsed.length === 0) {
        return { rows: [], error: "לא נמצאו אירועים בקובץ ה-ICS. ודא שהקובץ תקין." };
      }
      return {
        rows: parsed.map((e, i) => ({
          ...e,
          rowId: `r${i}`,
          selected: true,
          categoryId: defaultCategoryId,
          customName: e.summary,
        })),
        error: null,
      };
    } catch (err) {
      return { rows: [], error: "שגיאה בקריאת הקובץ: " + (err as Error).message };
    }
  });
  const setRows = (updater: (prev: Row[]) => Row[]) =>
    setState(s => ({ ...s, rows: updater(s.rows) }));
  const [bulkCat, setBulkCat] = useState(defaultCategoryId);
  const [importing, setImporting] = useState(false);

  const selectedCount = rows.filter(r => r.selected).length;
  const allSelected = rows.length > 0 && rows.every(r => r.selected);

  function toggle(rowId: string) {
    setRows(prev => prev.map(p => p.rowId === rowId ? { ...p, selected: !p.selected } : p));
  }
  function rename(rowId: string, name: string) {
    setRows(prev => prev.map(p => p.rowId === rowId ? { ...p, customName: name } : p));
  }
  function setCat(rowId: string, catId: string) {
    setRows(prev => prev.map(p => p.rowId === rowId ? { ...p, categoryId: catId } : p));
  }
  function applyBulkCat() {
    setRows(prev => prev.map(p => ({ ...p, categoryId: bulkCat })));
  }
  function toggleAll() {
    setRows(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  }

  async function handleImport() {
    if (selectedCount === 0) return;
    setImporting(true);
    const payload: IcsImportPayload[] = rows
      .filter(r => r.selected)
      .map(r => ({
        name: (r.customName.trim() || r.summary).slice(0, 200),
        category_id: r.categoryId,
        start_month: r.start.month,
        end_month: r.end.month,
        start_day: r.start.day,
        end_day: r.end.day,
        start_year: r.start.year,
        end_year: r.end.year,
        age_groups: [],
        location: r.location || null,
        responsible: null,
      }));
    const result = await onImport(payload);
    setImporting(false);
    if (result.failed === 0) onClose();
  }

  function formatRange(r: Row): string {
    const sameDay =
      r.start.year === r.end.year &&
      r.start.month === r.end.month &&
      r.start.day === r.end.day;
    const s = `${pad(r.start.day)}/${pad(r.start.month)}/${r.start.year}`;
    if (sameDay) return s;
    const sameYear = r.start.year === r.end.year;
    const e = sameYear
      ? `${pad(r.end.day)}/${pad(r.end.month)}`
      : `${pad(r.end.day)}/${pad(r.end.month)}/${r.end.year}`;
    return `${s} – ${e}`;
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: "var(--radius-xl)",
        padding: "1.75rem", width: "100%", maxWidth: 760, maxHeight: "85vh",
        overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        position: "relative",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", left: 16, top: 16,
          width: 30, height: 30, border: "none",
          background: "var(--bg-secondary)", borderRadius: "50%",
          cursor: "pointer", fontSize: 16,
        }}>×</button>

        <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 4px", color: primaryDark }}>
          📅 ייבוא לוח אירועים (ICS)
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "0 0 16px" }}>
          {fileName ? `קובץ: ${fileName} · ` : ""}
          {rows.length > 0 ? `נמצאו ${rows.length} אירועים` : "בחר אירועים לייבוא וקטגוריה לכל אחד"}
        </p>

        {error ? (
          <div style={{
            padding: "12px 14px", background: "#FEE2E2",
            border: "1px solid #FCA5A5", borderRadius: 8,
            color: "#991B1B", fontSize: 13,
          }}>
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 14, fontSize: 13, color: "var(--text-tertiary)" }}>טוען...</div>
        ) : (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: lighter, padding: "10px 12px",
              borderRadius: 10, border: `1px solid ${light}`,
              marginBottom: 12, flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 12, color: primaryDark, fontWeight: 500 }}>
                החל קטגוריה על הכל:
              </span>
              <select
                value={bulkCat}
                onChange={e => setBulkCat(e.target.value)}
                style={{
                  padding: "6px 10px", fontSize: 12, fontFamily: "inherit",
                  border: "0.5px solid var(--border)", borderRadius: 6,
                  background: "#fff", outline: "none",
                }}
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={applyBulkCat} style={{
                padding: "6px 12px", fontSize: 12,
                background: primary, color: "#fff",
                border: "none", borderRadius: 6, cursor: "pointer",
                fontFamily: "inherit",
              }}>החל</button>
              <span style={{ flex: 1 }} />
              <button onClick={toggleAll} style={{
                padding: "6px 12px", fontSize: 12,
                background: "#fff", color: primaryDark,
                border: `1px solid ${light}`, borderRadius: 6,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                {allSelected ? "בטל הכל" : "בחר הכל"}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {rows.map(r => (
                <div
                  key={r.rowId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 1fr 130px 160px",
                    gap: 10, alignItems: "center",
                    padding: "8px 10px",
                    background: r.selected ? "#fff" : "#fafafa",
                    border: "0.5px solid var(--border)",
                    borderRadius: 8,
                    opacity: r.selected ? 1 : 0.55,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={r.selected}
                    onChange={() => toggle(r.rowId)}
                    style={{ cursor: "pointer" }}
                  />
                  <input
                    value={r.customName}
                    onChange={e => rename(r.rowId, e.target.value)}
                    title={r.location ? `📍 ${r.location}` : r.summary}
                    style={{
                      width: "100%", padding: "6px 8px", fontSize: 12,
                      border: "0.5px solid var(--border)", borderRadius: 6,
                      fontFamily: "inherit", background: "#fff", outline: "none",
                    }}
                  />
                  <span style={{
                    fontSize: 11, color: "var(--text-secondary)",
                    direction: "ltr", textAlign: "left", whiteSpace: "nowrap",
                  }}>
                    {formatRange(r)}
                  </span>
                  <select
                    value={r.categoryId}
                    onChange={e => setCat(r.rowId, e.target.value)}
                    style={{
                      padding: "6px 8px", fontSize: 11, fontFamily: "inherit",
                      border: "0.5px solid var(--border)", borderRadius: 6,
                      background: "#fff", outline: "none",
                    }}
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <button
              onClick={handleImport}
              disabled={selectedCount === 0 || importing}
              style={{
                padding: "10px 0", fontSize: 14, fontWeight: 500,
                background: selectedCount > 0 && !importing ? primary : "var(--bg-secondary)",
                color: selectedCount > 0 && !importing ? "#fff" : "var(--text-tertiary)",
                border: "none", borderRadius: "var(--radius-md)",
                cursor: selectedCount > 0 && !importing ? "pointer" : "not-allowed",
                width: "100%",
              }}
            >
              {importing ? "מייבא..." : `ייבא ${selectedCount} אירועים`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

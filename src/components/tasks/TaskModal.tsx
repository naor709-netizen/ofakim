"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import {
  type Task, type TaskCategory, type TaskFile, type TaskNature,
  emptyTask, uid, updateTaskInTree, removeTaskFromTree, countSubtasks,
  formatDateHe, formatDateTimeHe,
  NATURE_LABELS, NATURE_COLORS, CATEGORY_COLOR_CHOICES,
} from "@/lib/tasks";

const TJ = {
  blue: "#2563EB", blueD: "#1E40AF", sky: "#0EA5E9", mint: "#14B8A6",
  mintL: "#CCFBF1", blueL: "#DBEAFE",
  grad: "linear-gradient(120deg, #2563EB 0%, #0EA5E9 48%, #14B8A6 100%)",
  bg: "#F2F8F9", ink: "#0F2540", ink2: "#4A6076",
  line: "rgba(15,37,64,0.10)", danger: "#EF4444",
};

const MAX_FILE_BYTES = 1.5 * 1024 * 1024;

function pathToTask(root: Task, id: string): string[] | null {
  if (root.id === id) return [root.id];
  for (const s of root.subtasks) {
    const p = pathToTask(s, id);
    if (p) return [root.id, ...p];
  }
  return null;
}

function taskAtPath(root: Task, path: string[]): Task {
  let cur = root;
  for (const id of path.slice(1)) {
    const next = cur.subtasks.find((s) => s.id === id);
    if (!next) return cur;
    cur = next;
  }
  return cur;
}

export function TaskModal({ root, focusId, categories, onSave, onDelete, onAddCategory, onClose }: {
  root: Task;
  focusId: string;
  categories: TaskCategory[];
  onSave: (updated: Task) => void;
  onDelete: (id: string) => void;
  onAddCategory: (name: string, color: string) => TaskCategory | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Task>(() => structuredClone(root));
  const [path, setPath] = useState<string[]>(() => pathToTask(root, focusId) ?? [root.id]);
  const [dirty, setDirty] = useState(false);

  // new category inline
  const [addingCat, setAddingCat] = useState(false);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState(CATEGORY_COLOR_CHOICES[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const current = useMemo(() => taskAtPath(draft, path), [draft, path]);
  const isRoot = path.length === 1;

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  function patch(p: Partial<Task>) {
    setDraft((d) => {
      const asRoot = d.id === current.id ? { ...d, ...p } : null;
      return asRoot ?? { ...d, subtasks: updateTaskInTree(d.subtasks, current.id, p) };
    });
    setDirty(true);
  }

  function save(close = true) {
    if (!draft.title.trim()) {
      toast("למשימה חייב להיות שם", "error");
      return;
    }
    onSave(draft);
    setDirty(false);
    toast("נשמר ✓", "success");
    if (close) onClose();
  }

  function addSubtask() {
    const sub: Task = { ...emptyTask(), title: "" };
    setDraft((d) =>
      d.id === current.id
        ? { ...d, subtasks: [...d.subtasks, sub] }
        : { ...d, subtasks: updateTaskInTree(d.subtasks, current.id, { subtasks: [...current.subtasks, sub] }) }
    );
    setDirty(true);
    setPath((p) => [...p, sub.id]);
  }

  function deleteCurrent() {
    if (isRoot) {
      if (confirm("למחוק את המשימה כולה, כולל כל השלבים?")) onDelete(draft.id);
      return;
    }
    if (!confirm("למחוק את השלב הזה, כולל תתי-השלבים שלו?")) return;
    const idToRemove = current.id;
    setDraft((d) => ({ ...d, subtasks: removeTaskFromTree(d.subtasks, idToRemove) }));
    setDirty(true);
    setPath((p) => p.slice(0, -1));
  }

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const added: TaskFile[] = [];
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_BYTES) {
        toast(`"${f.name}" גדול מדי (מקסימום 1.5MB לקובץ)`, "error");
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      }).catch(() => null as string | null);
      if (dataUrl) added.push({ id: uid(), name: f.name, type: f.type, size: f.size, dataUrl });
    }
    if (added.length) patch({ files: [...current.files, ...added] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function submitNewCategory() {
    if (!catName.trim()) return;
    const cat = onAddCategory(catName, catColor);
    if (cat) {
      patch({ categoryId: cat.id });
      setCatName("");
      setAddingCat(false);
    }
  }

  const breadcrumbTasks = path.map((_, i) => taskAtPath(draft, path.slice(0, i + 1)));

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,37,64,0.45)",
        backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-mobile-full"
        style={{
          background: "#fff", borderRadius: 22, width: "100%", maxWidth: 680,
          maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 20px 60px rgba(15,37,64,0.3)", color: TJ.ink,
        }}
      >
        {/* header */}
        <div style={{ background: TJ.grad, color: "#fff", padding: "16px 20px", flexShrink: 0 }}>
          {/* breadcrumb */}
          {path.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 8, fontSize: 11.5 }}>
              {breadcrumbTasks.map((t, i) => (
                <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {i > 0 && <span style={{ opacity: 0.6 }}>‹</span>}
                  {i < breadcrumbTasks.length - 1 ? (
                    <button onClick={() => setPath(path.slice(0, i + 1))} style={{
                      background: "rgba(255,255,255,0.18)", border: "none", color: "#fff",
                      borderRadius: 99, padding: "2px 10px", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit",
                    }}>
                      {t.title || "ללא שם"}
                    </button>
                  ) : (
                    <span style={{ fontWeight: 700, padding: "2px 4px" }}>{t.title || "שלב חדש"}</span>
                  )}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                value={current.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder={isRoot ? "שם המשימה…" : "שם השלב…"}
                autoFocus={!current.title}
                style={{
                  width: "100%", background: "transparent", border: "none", outline: "none",
                  color: "#fff", fontSize: 21, fontWeight: 700, fontFamily: "var(--font-display)",
                  borderBottom: "1.5px dashed rgba(255,255,255,0.4)", paddingBottom: 4,
                }}
              />
              <div className="num" style={{ fontSize: 11.5, marginTop: 7, opacity: 0.92 }}>
                🗓 נפתחה ב־{formatDateHe(current.createdAt)}
                {current.critical && <span style={{ marginInlineStart: 10 }}>🔥 קריטית</span>}
              </div>
            </div>
            <button onClick={onClose} title="סגירה" style={{
              background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
              width: 32, height: 32, borderRadius: 10, cursor: "pointer", fontSize: 15, flexShrink: 0,
            }}>✕</button>
          </div>
        </div>

        {/* body */}
        <div style={{ overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* status + flags */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => patch({ done: !current.done, endDate: !current.done && !current.endDate ? new Date().toISOString().slice(0, 10) : current.endDate })} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: current.done ? TJ.mintL : "#fff", color: current.done ? "#0F766E" : TJ.ink2,
              border: `1px solid ${current.done ? TJ.mint : TJ.line}`,
              borderRadius: 99, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              {current.done ? "✓ הושלמה" : "○ סימון כהושלמה"}
            </button>
            <button onClick={() => patch({ critical: !current.critical })} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: current.critical ? "#FEE2E2" : "#fff", color: current.critical ? "#B91C1C" : TJ.ink2,
              border: `1px solid ${current.critical ? "#FCA5A5" : TJ.line}`,
              borderRadius: 99, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              🔥 {current.critical ? "קריטית" : "סימון כקריטית"}
            </button>
            {/* nature: אישי / דחוף / שוטף */}
            <div style={{ display: "inline-flex", gap: 5, marginInlineStart: "auto" }}>
              {(Object.keys(NATURE_LABELS) as TaskNature[]).map((n) => {
                const active = current.nature === n;
                return (
                  <button key={n} onClick={() => patch({ nature: active ? null : n })} style={{
                    borderRadius: 99, padding: "6px 14px", fontSize: 12, cursor: "pointer",
                    border: `1px solid ${active ? NATURE_COLORS[n] : TJ.line}`,
                    background: active ? `${NATURE_COLORS[n]}1A` : "#fff",
                    color: active ? NATURE_COLORS[n] : TJ.ink2, fontWeight: active ? 700 : 400,
                  }}>
                    {NATURE_LABELS[n]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* category */}
          <Field label="קטגוריה">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {categories.map((c) => {
                const active = current.categoryId === c.id;
                return (
                  <button key={c.id} onClick={() => patch({ categoryId: active ? null : c.id })} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    borderRadius: 99, padding: "6px 13px", fontSize: 12.5, cursor: "pointer",
                    border: `1px solid ${active ? c.color : TJ.line}`,
                    background: active ? `${c.color}1A` : "#fff",
                    color: active ? c.color : TJ.ink2, fontWeight: active ? 700 : 400,
                  }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color }} />
                    {c.name}
                  </button>
                );
              })}
              <button onClick={() => setAddingCat((v) => !v)} style={{
                borderRadius: 99, padding: "6px 13px", fontSize: 12.5, cursor: "pointer",
                border: `1px dashed ${TJ.line}`, background: "transparent", color: TJ.ink2,
              }}>＋ חדשה</button>
            </div>
            {addingCat && (
              <div style={{ marginTop: 8, background: TJ.bg, borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <input className="f-input" placeholder="שם הקטגוריה" value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitNewCategory(); }}
                  style={{ padding: "7px 10px", fontSize: 12 }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                  {CATEGORY_COLOR_CHOICES.map((col) => (
                    <button key={col} onClick={() => setCatColor(col)} style={{
                      width: 20, height: 20, borderRadius: 7, background: col, cursor: "pointer",
                      border: catColor === col ? "2px solid #0F2540" : "2px solid transparent",
                    }} />
                  ))}
                  <input type="color" value={catColor} onChange={(e) => setCatColor(e.target.value)} title="צבע חופשי"
                    style={{ width: 20, height: 20, padding: 0, border: "none", background: "transparent", cursor: "pointer" }} />
                  <button onClick={submitNewCategory} disabled={!catName.trim()} style={{
                    marginInlineStart: "auto", background: catName.trim() ? TJ.grad : "#D8E4E6", color: "#fff",
                    border: "none", borderRadius: 9, padding: "6px 16px", fontSize: 12, fontWeight: 600,
                    cursor: catName.trim() ? "pointer" : "default",
                  }}>הוספה</button>
                </div>
              </div>
            )}
          </Field>

          {/* description */}
          <Field label="מהות המשימה">
            <textarea
              className="f-input" rows={2} value={current.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="מה צריך לעשות?"
              style={{ width: "100%", resize: "vertical", fontFamily: "inherit" }}
            />
          </Field>

          {/* dates */}
          <div className="tj-dates" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="🎯 תאריך יעד (מוצג בלוח השנה)">
              <input type="date" className="f-input" value={current.dueDate ?? ""}
                onChange={(e) => patch({ dueDate: e.target.value || null })} style={{ width: "100%", minWidth: 0 }} />
            </Field>
            <Field label="🏁 תאריך סיום">
              <input type="date" className="f-input" value={current.endDate ?? ""}
                onChange={(e) => patch({ endDate: e.target.value || null })} style={{ width: "100%", minWidth: 0 }} />
            </Field>
          </div>
          <style>{`@media (max-width: 560px) { .tj-dates { grid-template-columns: 1fr !important; } }`}</style>

          {/* reminders */}
          <Field label="⏰ תזכורות">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {current.reminders.map((r) => (
                <div key={r.id} style={{
                  display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap",
                  background: r.fired ? "#F1F5F9" : TJ.mintL, borderRadius: 10, padding: "7px 9px",
                }}>
                  <input
                    type="datetime-local" className="f-input" value={r.datetime.slice(0, 16)}
                    onChange={(e) => patch({
                      reminders: current.reminders.map((x) => x.id === r.id ? { ...x, datetime: e.target.value, fired: false } : x),
                    })}
                    style={{ padding: "5px 8px", fontSize: 12, background: "#fff" }}
                  />
                  <input
                    className="f-input" placeholder="הערה לתזכורת (לא חובה)" value={r.note}
                    onChange={(e) => patch({
                      reminders: current.reminders.map((x) => x.id === r.id ? { ...x, note: e.target.value } : x),
                    })}
                    style={{ flex: 1, minWidth: 120, padding: "5px 8px", fontSize: 12, background: "#fff" }}
                  />
                  {r.fired && <span className="tag" style={{ fontSize: 10 }}>נשלחה</span>}
                  <button onClick={() => patch({ reminders: current.reminders.filter((x) => x.id !== r.id) })} style={{
                    background: "transparent", border: "none", color: TJ.danger, cursor: "pointer", fontSize: 13,
                  }}>✕</button>
                </div>
              ))}
              <button onClick={() => {
                const dt = new Date(Date.now() + 60 * 60 * 1000);
                dt.setSeconds(0, 0);
                const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                patch({ reminders: [...current.reminders, { id: uid(), datetime: local, note: "", fired: false }] });
              }} style={{
                alignSelf: "flex-start", background: "#fff", border: `1px dashed ${TJ.line}`,
                borderRadius: 10, padding: "7px 14px", fontSize: 12, color: TJ.blueD, cursor: "pointer", fontWeight: 600,
              }}>
                ＋ הוספת תזכורת
              </button>
            </div>
          </Field>

          {/* notes */}
          <Field label="📝 הערות">
            <textarea
              className="f-input" rows={3} value={current.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="הערות חופשיות…"
              style={{ width: "100%", resize: "vertical", fontFamily: "inherit" }}
            />
          </Field>

          {/* files */}
          <Field label="📎 קבצים מצורפים">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {current.files.map((f) => (
                <div key={f.id} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: TJ.bg, borderRadius: 10, padding: "7px 10px",
                }}>
                  <span style={{ fontSize: 15 }}>{f.type.startsWith("image/") ? "🖼" : "📄"}</span>
                  <a href={f.dataUrl} download={f.name} style={{
                    flex: 1, minWidth: 0, fontSize: 12.5, color: TJ.blueD, textDecoration: "none",
                    fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {f.name}
                  </a>
                  <span className="num" style={{ fontSize: 10.5, color: TJ.ink2 }}>{(f.size / 1024).toFixed(0)}KB</span>
                  <button onClick={() => patch({ files: current.files.filter((x) => x.id !== f.id) })} style={{
                    background: "transparent", border: "none", color: TJ.danger, cursor: "pointer", fontSize: 13,
                  }}>✕</button>
                </div>
              ))}
              <input ref={fileInputRef} type="file" multiple style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)} />
              <button onClick={() => fileInputRef.current?.click()} style={{
                alignSelf: "flex-start", background: "#fff", border: `1px dashed ${TJ.line}`,
                borderRadius: 10, padding: "7px 14px", fontSize: 12, color: TJ.blueD, cursor: "pointer", fontWeight: 600,
              }}>
                ＋ צירוף קובץ
              </button>
            </div>
          </Field>

          {/* subtasks */}
          <Field label={`🪜 שלבים (${countSubtasks(current).done}/${countSubtasks(current).total})`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {current.subtasks.map((s) => {
                const sc = countSubtasks(s);
                return (
                  <div key={s.id}
                    onClick={() => setPath((p) => [...p, s.id])}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                      background: "#fff", border: `0.5px solid ${TJ.line}`,
                      borderInlineStart: `4px solid ${s.critical ? TJ.danger : TJ.mint}`,
                      borderRadius: 12, padding: "9px 11px", opacity: s.done ? 0.6 : 1,
                    }}>
                    <input type="checkbox" checked={s.done}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => {
                        setDraft((d) => ({ ...d, subtasks: updateTaskInTree(d.subtasks, s.id, { done: !s.done }) }));
                        setDirty(true);
                      }}
                      style={{ width: 16, height: 16, accentColor: TJ.mint, cursor: "pointer" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, textDecoration: s.done ? "line-through" : "none" }}>
                          {s.title || "ללא שם"}
                        </span>
                        <span className="num" style={{ fontSize: 10, color: TJ.ink2 }}>נפתחה {formatDateHe(s.createdAt)}</span>
                      </div>
                      <div style={{ display: "flex", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
                        {s.critical && <span className="tag danger" style={{ fontSize: 9.5 }}>🔥</span>}
                        {s.nature && <span className="tag" style={{ fontSize: 9.5, color: NATURE_COLORS[s.nature] }}>{NATURE_LABELS[s.nature]}</span>}
                        {s.dueDate && <span className="tag num" style={{ fontSize: 9.5 }}>🎯 {formatDateHe(s.dueDate)}</span>}
                        {s.files.length > 0 && <span className="tag" style={{ fontSize: 9.5 }}>📎 {s.files.length}</span>}
                        {sc.total > 0 && <span className="tag num" style={{ fontSize: 9.5 }}>{sc.done}/{sc.total} שלבים</span>}
                      </div>
                    </div>
                    <span style={{ color: TJ.ink2, opacity: 0.5 }}>‹</span>
                  </div>
                );
              })}
              <button onClick={addSubtask} style={{
                alignSelf: "flex-start", background: TJ.blueL, border: "none",
                borderRadius: 10, padding: "8px 16px", fontSize: 12.5, color: TJ.blueD, cursor: "pointer", fontWeight: 700,
              }}>
                ＋ הוספת שלב
              </button>
              <div style={{ fontSize: 10.5, color: TJ.ink2 }}>
                לכל שלב יש את כל המאפיינים של משימה — קטגוריה, תאריכים, תזכורות, הערות, קבצים ותתי-שלבים.
              </div>
            </div>
          </Field>

          {/* completion info */}
          {current.done && current.endDate && (
            <div style={{ fontSize: 12, color: "#0F766E", background: TJ.mintL, borderRadius: 10, padding: "8px 12px" }}>
              ✓ הושלמה · תאריך סיום {formatDateHe(current.endDate)} · נפתחה {formatDateTimeHe(current.createdAt)}
            </div>
          )}
        </div>

        {/* footer */}
        <div style={{
          flexShrink: 0, borderTop: `0.5px solid ${TJ.line}`, padding: "12px 20px",
          display: "flex", alignItems: "center", gap: 8, background: "#FBFDFE",
        }}>
          <button onClick={deleteCurrent} style={{
            background: "transparent", border: `1px solid #FCA5A5`, color: "#B91C1C",
            borderRadius: 11, padding: "9px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600,
          }}>
            {isRoot ? "מחיקת משימה" : "מחיקת שלב"}
          </button>
          {!isRoot && (
            <button onClick={() => setPath((p) => p.slice(0, -1))} style={{
              background: "#fff", border: `0.5px solid ${TJ.line}`, color: TJ.ink2,
              borderRadius: 11, padding: "9px 16px", fontSize: 13, cursor: "pointer",
            }}>
              ‹ חזרה למשימה
            </button>
          )}
          <div style={{ marginInlineStart: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {dirty && <span style={{ fontSize: 11, color: TJ.ink2 }}>יש שינויים שלא נשמרו</span>}
            <button onClick={onClose} style={{
              background: "#fff", border: `0.5px solid ${TJ.line}`, color: TJ.ink2,
              borderRadius: 11, padding: "9px 18px", fontSize: 13, cursor: "pointer",
            }}>ביטול</button>
            <button onClick={() => save(true)} style={{
              background: TJ.grad, border: "none", color: "#fff",
              borderRadius: 11, padding: "9px 26px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 3px 12px rgba(37,99,235,0.35)",
            }}>שמירה</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#0F2540", marginBottom: 7 }}>{label}</div>
      {children}
    </div>
  );
}

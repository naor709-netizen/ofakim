"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { TopBar } from "@/components/v3/TopBar";
import { useToast } from "@/components/Toast";
import {
  type JournalData, type Task, type TaskCategory, type TaskNature,
  subscribeJournal, getJournalSnapshot, getServerJournalSnapshot, setJournalData,
  emptyTask, uid,
  replaceTaskInTree, removeTaskFromTree, flattenTasks, countSubtasks,
  toDateKey, formatDateHe,
  NATURE_LABELS, NATURE_COLORS, HE_MONTHS, HE_WEEKDAYS, CATEGORY_COLOR_CHOICES,
} from "@/lib/tasks";
import { TaskModal } from "./TaskModal";

// blue–mint palette
const TJ = {
  blue: "#2563EB",
  blueD: "#1E40AF",
  sky: "#0EA5E9",
  mint: "#14B8A6",
  mintL: "#CCFBF1",
  blueL: "#DBEAFE",
  grad: "linear-gradient(120deg, #2563EB 0%, #0EA5E9 48%, #14B8A6 100%)",
  bg: "#F2F8F9",
  ink: "#0F2540",
  ink2: "#4A6076",
  line: "rgba(15,37,64,0.10)",
  danger: "#EF4444",
};

const card: React.CSSProperties = {
  background: "#fff", borderRadius: 18, border: `0.5px solid ${TJ.line}`,
  boxShadow: "0 2px 12px rgba(15,37,64,0.05)",
};

export default function TaskJournal() {
  const { toast } = useToast();
  const journal = useSyncExternalStore(subscribeJournal, getJournalSnapshot, getServerJournalSnapshot);

  // filters
  const [catFilter, setCatFilter] = useState<Set<string>>(new Set());
  const [natureFilter, setNatureFilter] = useState<Set<TaskNature>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "done">("all");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // calendar
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-11

  // modal
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  // sidebar: add category
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLOR_CHOICES[0]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function persist(next: JournalData) {
    if (!setJournalData(next)) toast("השמירה נכשלה — ייתכן שהקבצים המצורפים גדולים מדי", "error");
  }

  // ---- reminders: browser notifications while the journal is open ----
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    function check() {
      const now = Date.now();
      setNowTick(now);
      const j = getJournalSnapshot();
      if (!j) return;
      if (flattenTasks(j.tasks).some((t) => t.reminders.length > 0) &&
          typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }
      let changed = false;
      let tasks = j.tasks;
      for (const t of flattenTasks(tasks)) {
        for (const r of t.reminders) {
          if (!r.fired && new Date(r.datetime).getTime() <= now) {
            changed = true;
            const updated: Task = {
              ...t,
              reminders: t.reminders.map((x) => (x.id === r.id ? { ...x, fired: true } : x)),
            };
            tasks = replaceTaskInTree(tasks, updated);
            const body = r.note || t.title;
            toast(`⏰ תזכורת: ${body}`, "info");
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("יומן המשימות של אופיר", { body: `⏰ ${body}` });
            }
          }
        }
      }
      if (changed) setJournalData({ ...j, tasks });
    }
    const t = setTimeout(check, 800);
    const iv = setInterval(check, 20000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [toast]);

  // ---- derived ----
  const categories = useMemo(() => journal?.categories ?? [], [journal]);
  const catById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])) as Record<string, TaskCategory>,
    [categories]
  );

  const filteredTasks = useMemo(() => {
    const q = search.trim();
    return (journal?.tasks ?? []).filter((t) => {
      if (catFilter.size > 0 && !(t.categoryId && catFilter.has(t.categoryId))) return false;
      if (natureFilter.size > 0 && !(t.nature && natureFilter.has(t.nature))) return false;
      if (statusFilter === "open" && t.done) return false;
      if (statusFilter === "done" && !t.done) return false;
      if (criticalOnly && !t.critical) return false;
      if (q) {
        const inTree = [t, ...flattenTasks(t.subtasks)].some(
          (x) => x.title.includes(q) || x.description.includes(q) || x.notes.includes(q)
        );
        if (!inTree) return false;
      }
      if (selectedDate && t.dueDate !== selectedDate && t.endDate !== selectedDate) return false;
      return true;
    });
  }, [journal, catFilter, natureFilter, statusFilter, criticalOnly, search, selectedDate]);

  const criticalTasks = filteredTasks.filter((t) => t.critical && !t.done);
  const regularTasks = filteredTasks.filter((t) => !(t.critical && !t.done));

  const allFlat = useMemo(() => flattenTasks(journal?.tasks ?? []), [journal]);
  const openCount = allFlat.filter((t) => !t.done).length;
  const criticalCount = allFlat.filter((t) => t.critical && !t.done).length;
  const todayKey = toDateKey(today);
  const dueTodayCount = allFlat.filter((t) => !t.done && t.dueDate === todayKey).length;

  const upcomingReminders = useMemo(() => {
    if (!nowTick) return [];
    return allFlat
      .flatMap((t) => t.reminders.filter((r) => !r.fired && new Date(r.datetime).getTime() >= nowTick)
        .map((r) => ({ task: t, r })))
      .sort((a, b) => a.r.datetime.localeCompare(b.r.datetime))
      .slice(0, 5);
  }, [allFlat, nowTick]);

  // tasks (incl. subtasks) with a due date, for the calendar — respecting filters on top-level
  const calendarItems = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const root of filteredTasks) {
      for (const t of [root, ...flattenTasks(root.subtasks)]) {
        if (t.dueDate) (map[t.dueDate] ??= []).push(t);
      }
    }
    return map;
  }, [filteredTasks]);

  // ---- actions ----
  function addCategory(name: string, color: string): TaskCategory | null {
    if (!journal || !name.trim()) return null;
    const cat: TaskCategory = { id: uid(), name: name.trim(), color };
    persist({ ...journal, categories: [...journal.categories, cat] });
    return cat;
  }

  function deleteCategory(id: string) {
    if (!journal) return;
    const clearCat = (list: Task[]): Task[] =>
      list.map((t) => ({
        ...t,
        categoryId: t.categoryId === id ? null : t.categoryId,
        subtasks: clearCat(t.subtasks),
      }));
    persist({
      ...journal,
      categories: journal.categories.filter((c) => c.id !== id),
      tasks: clearCat(journal.tasks),
    });
    setCatFilter((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  function createTask() {
    if (!journal) return;
    const t = { ...emptyTask(), title: "משימה חדשה" };
    persist({ ...journal, tasks: [t, ...journal.tasks] });
    setOpenTaskId(t.id);
  }

  function saveTask(updated: Task) {
    if (!journal) return;
    persist({ ...journal, tasks: replaceTaskInTree(journal.tasks, updated) });
  }

  function deleteTask(id: string) {
    if (!journal) return;
    persist({ ...journal, tasks: removeTaskFromTree(journal.tasks, id) });
    setOpenTaskId(null);
    toast("המשימה נמחקה", "info");
  }

  function toggleDone(t: Task) {
    saveTask({ ...t, done: !t.done, endDate: !t.done ? (t.endDate ?? todayKey) : t.endDate });
  }

  function toggleSet<T>(set: Set<T>, v: T, setter: (s: Set<T>) => void) {
    const n = new Set(set);
    if (n.has(v)) n.delete(v); else n.add(v);
    setter(n);
  }

  // the modal edits a ROOT task tree; find the root containing openTaskId
  const openRoot = openTaskId && journal
    ? journal.tasks.find((root) => [root, ...flattenTasks(root.subtasks)].some((t) => t.id === openTaskId)) ?? null
    : null;

  const filtersActive = catFilter.size > 0 || natureFilter.size > 0 || statusFilter !== "all" || criticalOnly || !!search.trim() || !!selectedDate;

  if (!journal) {
    return (
      <div style={{ minHeight: "100vh", background: TJ.bg }}>
        <TopBar variant="neutral" title="יומן המשימות של אופיר" subtitle="OFIR · TASK JOURNAL" showOfaktiviLogo={false} showUserChip={false} />
        <div style={{ padding: 40, display: "grid", gap: 12 }}>
          <div className="skeleton" style={{ height: 120, borderRadius: 18 }} />
          <div className="skeleton" style={{ height: 340, borderRadius: 18 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: TJ.bg, color: TJ.ink }}>
      <TopBar variant="neutral" title="יומן המשימות של אופיר" subtitle="OFIR · TASK JOURNAL" showOfaktiviLogo={false} showUserChip={false} />

      {/* ===== Hero ===== */}
      <div style={{ background: TJ.grad, color: "#fff", padding: "26px 22px 30px", position: "relative", overflow: "hidden" }}>
        <div className="softblob" style={{ width: 260, height: 260, background: "#99F6E4", top: -120, insetInlineStart: "12%" }} />
        <div className="softblob" style={{ width: 300, height: 300, background: "#BFDBFE", bottom: -170, insetInlineEnd: "6%" }} />
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18, position: "relative" }}>
          <div style={{ flex: "1 1 260px" }}>
            <h1 className="disp" style={{ margin: 0, fontSize: 30 }}>יומן המשימות של אופיר ✨</h1>
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.92 }}>
              {today.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <HeroStat label="משימות פתוחות" value={openCount} />
            <HeroStat label="קריטיות" value={criticalCount} accent />
            <HeroStat label="יעד להיום" value={dueTodayCount} />
          </div>
          <button onClick={createTask} style={{
            background: "#fff", color: TJ.blueD, border: "none", borderRadius: 14,
            padding: "13px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 18px rgba(0,0,0,0.18)", fontFamily: "var(--font-display)",
          }}>
            ＋ משימה חדשה
          </button>
        </div>
      </div>

      {/* ===== Body: sidebar + main ===== */}
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "20px 16px 60px", display: "flex", gap: 18, alignItems: "flex-start" }}>

        {/* ---- Sidebar ---- */}
        <aside style={{
          ...card, width: 262, flexShrink: 0, padding: 16,
          position: "sticky", top: 14,
          display: sidebarOpen ? "block" : undefined,
        }} className={sidebarOpen ? "" : "tj-sidebar"}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>סינון</div>

          <input
            className="f-input" placeholder="🔍 חיפוש משימה…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", marginBottom: 14, borderRadius: 12 }}
          />

          {/* categories */}
          <SectionTitle>קטגוריות</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
            {categories.map((c) => {
              const active = catFilter.has(c.id);
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    onClick={() => toggleSet(catFilter, c.id, setCatFilter)}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", gap: 9, textAlign: "start",
                      background: active ? `${c.color}1A` : "transparent",
                      border: `1px solid ${active ? c.color : "transparent"}`,
                      borderRadius: 10, padding: "7px 10px", cursor: "pointer",
                      fontSize: 13, fontWeight: active ? 600 : 400, color: TJ.ink, fontFamily: "inherit",
                    }}>
                    <span style={{ width: 11, height: 11, borderRadius: 4, background: c.color, flexShrink: 0 }} />
                    {c.name}
                    {active && <span style={{ marginInlineStart: "auto", color: c.color, fontSize: 12 }}>✓</span>}
                  </button>
                  <button title="מחיקת קטגוריה" onClick={() => deleteCategory(c.id)} style={{
                    background: "transparent", border: "none", color: TJ.ink2, opacity: 0.45,
                    cursor: "pointer", fontSize: 12, padding: 4,
                  }}>✕</button>
                </div>
              );
            })}
          </div>

          {/* add category */}
          <div style={{ background: TJ.bg, borderRadius: 12, padding: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: TJ.ink2, marginBottom: 6 }}>＋ קטגוריה חדשה</div>
            <input
              className="f-input" placeholder="שם הקטגוריה" value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newCatName.trim()) { addCategory(newCatName, newCatColor); setNewCatName(""); } }}
              style={{ width: "100%", padding: "7px 10px", fontSize: 12, marginBottom: 8 }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
              {CATEGORY_COLOR_CHOICES.map((col) => (
                <button key={col} onClick={() => setNewCatColor(col)} style={{
                  width: 20, height: 20, borderRadius: 7, background: col, cursor: "pointer",
                  border: newCatColor === col ? "2px solid #0F2540" : "2px solid transparent",
                  outline: newCatColor === col ? "2px solid #fff" : "none", outlineOffset: -3,
                }} />
              ))}
              <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)}
                title="צבע חופשי"
                style={{ width: 20, height: 20, padding: 0, border: "none", borderRadius: 7, cursor: "pointer", background: "transparent" }} />
            </div>
            <button
              onClick={() => { if (newCatName.trim()) { addCategory(newCatName, newCatColor); setNewCatName(""); } }}
              disabled={!newCatName.trim()}
              style={{
                width: "100%", background: newCatName.trim() ? TJ.grad : "#D8E4E6", color: "#fff",
                border: "none", borderRadius: 10, padding: "8px 0", fontSize: 12, fontWeight: 600,
                cursor: newCatName.trim() ? "pointer" : "default",
              }}>
              הוספה
            </button>
          </div>

          {/* nature */}
          <SectionTitle>מהות</SectionTitle>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {(Object.keys(NATURE_LABELS) as TaskNature[]).map((n) => {
              const active = natureFilter.has(n);
              return (
                <button key={n} onClick={() => toggleSet(natureFilter, n, setNatureFilter)} style={{
                  borderRadius: 99, padding: "5px 13px", fontSize: 12, cursor: "pointer",
                  border: `1px solid ${active ? NATURE_COLORS[n] : TJ.line}`,
                  background: active ? `${NATURE_COLORS[n]}1A` : "#fff",
                  color: active ? NATURE_COLORS[n] : TJ.ink2, fontWeight: active ? 700 : 400,
                }}>
                  {NATURE_LABELS[n]}
                </button>
              );
            })}
          </div>

          {/* status */}
          <SectionTitle>סטטוס</SectionTitle>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {([["all", "הכל"], ["open", "פתוחות"], ["done", "הושלמו"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setStatusFilter(v)} style={{
                flex: 1, borderRadius: 10, padding: "6px 0", fontSize: 12, cursor: "pointer",
                border: `1px solid ${statusFilter === v ? TJ.blue : TJ.line}`,
                background: statusFilter === v ? TJ.blueL : "#fff",
                color: statusFilter === v ? TJ.blueD : TJ.ink2, fontWeight: statusFilter === v ? 700 : 400,
              }}>{label}</button>
            ))}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 16 }}>
            <input type="checkbox" checked={criticalOnly} onChange={(e) => setCriticalOnly(e.target.checked)}
              style={{ accentColor: TJ.danger, width: 15, height: 15 }} />
            <span style={{ color: TJ.danger, fontWeight: 600 }}>🔥 רק משימות קריטיות</span>
          </label>

          {filtersActive && (
            <button onClick={() => {
              setCatFilter(new Set()); setNatureFilter(new Set()); setStatusFilter("all");
              setCriticalOnly(false); setSearch(""); setSelectedDate(null);
            }} style={{
              width: "100%", background: "transparent", border: `1px dashed ${TJ.line}`,
              borderRadius: 10, padding: "7px 0", fontSize: 12, color: TJ.ink2, cursor: "pointer", marginBottom: 14,
            }}>
              ניקוי כל הסינונים
            </button>
          )}

          {/* upcoming reminders */}
          {upcomingReminders.length > 0 && (
            <>
              <SectionTitle>⏰ תזכורות קרובות</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {upcomingReminders.map(({ task, r }) => (
                  <button key={r.id} onClick={() => setOpenTaskId(task.id)} style={{
                    textAlign: "start", background: TJ.mintL, border: "none", borderRadius: 10,
                    padding: "8px 10px", cursor: "pointer", fontFamily: "inherit",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: TJ.ink }}>{r.note || task.title}</div>
                    <div style={{ fontSize: 10.5, color: "#0F766E", marginTop: 2 }} className="num">
                      {new Date(r.datetime).toLocaleString("he-IL", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* ---- Main ---- */}
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* mobile: sidebar toggle */}
          <button className="tj-sidebar-toggle" onClick={() => setSidebarOpen((o) => !o)} style={{
            display: "none", ...card, padding: "10px 16px", fontSize: 13, fontWeight: 600,
            color: TJ.blueD, cursor: "pointer", textAlign: "start",
          }}>
            {sidebarOpen ? "✕ סגירת סינון" : "☰ סינון וקטגוריות"}
          </button>

          {/* ===== Critical tasks — separate section ===== */}
          {criticalTasks.length > 0 && (
            <section style={{ ...card, padding: 16, borderColor: "#FCA5A5", background: "linear-gradient(180deg,#FFF5F5,#fff)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>🔥</span>
                <h2 className="disp" style={{ margin: 0, fontSize: 17, color: "#B91C1C" }}>משימות קריטיות</h2>
                <span className="tag danger">{criticalTasks.length}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
                {criticalTasks.map((t) => (
                  <TaskRow key={t.id} task={t} cat={t.categoryId ? catById[t.categoryId] : undefined}
                    critical onOpen={() => setOpenTaskId(t.id)} onToggle={() => toggleDone(t)} compact />
                ))}
              </div>
            </section>
          )}

          {/* ===== Calendar ===== */}
          <section style={{ ...card, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <h2 className="disp" style={{ margin: 0, fontSize: 18 }}>📅 לוח שנה</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginInlineStart: "auto" }}>
                <CalNavBtn onClick={() => { const m = calMonth - 1; if (m < 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(m); }}>‹</CalNavBtn>
                <div style={{ minWidth: 130, textAlign: "center", fontWeight: 700, fontSize: 15, fontFamily: "var(--font-display)" }}>
                  {HE_MONTHS[calMonth]} {calYear}
                </div>
                <CalNavBtn onClick={() => { const m = calMonth + 1; if (m > 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(m); }}>›</CalNavBtn>
                <button onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); }} style={{
                  marginInlineStart: 6, background: TJ.blueL, color: TJ.blueD, border: "none",
                  borderRadius: 99, padding: "5px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>היום</button>
              </div>
            </div>

            <CalendarGrid
              year={calYear} month={calMonth} todayKey={todayKey}
              items={calendarItems} catById={catById}
              selectedDate={selectedDate}
              onSelectDate={(k) => setSelectedDate(selectedDate === k ? null : k)}
              onOpenTask={(id) => setOpenTaskId(id)}
            />

            {selectedDate && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span className="tag" style={{ background: TJ.mintL, color: "#0F766E", borderColor: "#99F6E4" }}>
                  מסונן לתאריך {formatDateHe(selectedDate)}
                </span>
                <button onClick={() => setSelectedDate(null)} style={{ background: "none", border: "none", color: TJ.ink2, cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>
                  הצגת הכל
                </button>
              </div>
            )}
          </section>

          {/* ===== Task rows ===== */}
          <section style={{ ...card, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <h2 className="disp" style={{ margin: 0, fontSize: 18 }}>📋 המשימות שלי</h2>
              <span className="tag" style={{ background: TJ.blueL, color: TJ.blueD, borderColor: "#BFDBFE" }}>{filteredTasks.length}</span>
            </div>

            {filteredTasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "44px 20px", color: TJ.ink2 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🌿</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {filtersActive ? "אין משימות שתואמות את הסינון" : "היומן ריק — זה הזמן להתחיל!"}
                </div>
                {!filtersActive && (
                  <button onClick={createTask} style={{
                    marginTop: 14, background: TJ.grad, color: "#fff", border: "none",
                    borderRadius: 12, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}>＋ משימה ראשונה</button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {regularTasks.map((t) => (
                  <TaskRow key={t.id} task={t} cat={t.categoryId ? catById[t.categoryId] : undefined}
                    onOpen={() => setOpenTaskId(t.id)} onToggle={() => toggleDone(t)} />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* modal */}
      {openRoot && (
        <TaskModal
          root={openRoot}
          focusId={openTaskId!}
          categories={categories}
          onSave={saveTask}
          onDelete={deleteTask}
          onAddCategory={addCategory}
          onClose={() => setOpenTaskId(null)}
        />
      )}

      <style>{`
        @media (max-width: 900px) {
          .tj-sidebar { display: none; }
          .tj-sidebar-toggle { display: block !important; }
        }
      `}</style>
    </div>
  );
}

// ============ small pieces ============

function HeroStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.16)", backdropFilter: "blur(6px)",
      border: "1px solid rgba(255,255,255,0.28)", borderRadius: 14,
      padding: "10px 18px", minWidth: 92, textAlign: "center",
    }}>
      <div className="num" style={{ fontSize: 24, fontWeight: 700, color: accent && value > 0 ? "#FDE68A" : "#fff" }}>{value}</div>
      <div style={{ fontSize: 11, opacity: 0.9 }}>{label}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: "#0F2540", marginBottom: 8 }}>{children}</div>;
}

function CalNavBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 30, height: 30, borderRadius: 10, border: `0.5px solid ${TJ.line}`,
      background: "#fff", cursor: "pointer", fontSize: 16, color: TJ.ink2,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}>{children}</button>
  );
}

function TaskRow({ task, cat, onOpen, onToggle, critical, compact }: {
  task: Task;
  cat?: TaskCategory;
  onOpen: () => void;
  onToggle: () => void;
  critical?: boolean;
  compact?: boolean;
}) {
  const sub = countSubtasks(task);
  const accent = critical ? TJ.danger : (cat?.color ?? TJ.sky);
  return (
    <div
      onClick={onOpen}
      style={{
        display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
        background: "#fff", border: `0.5px solid ${critical ? "#FCA5A5" : TJ.line}`,
        borderInlineStart: `4px solid ${accent}`,
        borderRadius: 14, padding: compact ? "10px 12px" : "12px 14px",
        opacity: task.done ? 0.62 : 1,
        transition: "box-shadow .15s, transform .1s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(15,37,64,0.10)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
    >
      <input
        type="checkbox" checked={task.done}
        onClick={(e) => e.stopPropagation()}
        onChange={onToggle}
        style={{ width: 18, height: 18, accentColor: TJ.mint, cursor: "pointer", flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            fontWeight: 600, fontSize: compact ? 13.5 : 14.5,
            textDecoration: task.done ? "line-through" : "none",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
          }}>
            {task.title || "ללא שם"}
          </span>
          <span className="num" style={{ fontSize: 10.5, color: TJ.ink2, flexShrink: 0 }}>
            נפתחה {formatDateHe(task.createdAt)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
          {task.critical && <span className="tag danger" style={{ fontSize: 10 }}>🔥 קריטי</span>}
          {cat && (
            <span className="tag" style={{ fontSize: 10, background: `${cat.color}18`, color: cat.color, borderColor: `${cat.color}55` }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color }} />
              {cat.name}
            </span>
          )}
          {task.nature && (
            <span className="tag" style={{ fontSize: 10, background: `${NATURE_COLORS[task.nature]}14`, color: NATURE_COLORS[task.nature], borderColor: `${NATURE_COLORS[task.nature]}44` }}>
              {NATURE_LABELS[task.nature]}
            </span>
          )}
          {task.dueDate && (
            <span className="tag num" style={{ fontSize: 10 }}>🎯 יעד {formatDateHe(task.dueDate)}</span>
          )}
          {task.reminders.some((r) => !r.fired) && <span className="tag" style={{ fontSize: 10 }}>⏰</span>}
          {task.files.length > 0 && <span className="tag" style={{ fontSize: 10 }}>📎 {task.files.length}</span>}
          {sub.total > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: TJ.ink2 }}>
              <span style={{ width: 52, height: 5, borderRadius: 99, background: "#E2ECF0", overflow: "hidden", display: "inline-block" }}>
                <span style={{ display: "block", height: "100%", width: `${(sub.done / sub.total) * 100}%`, background: TJ.grad, borderRadius: 99 }} />
              </span>
              <span className="num">{sub.done}/{sub.total} שלבים</span>
            </span>
          )}
        </div>
      </div>
      <span style={{ color: TJ.ink2, fontSize: 16, flexShrink: 0, opacity: 0.5 }}>‹</span>
    </div>
  );
}

function CalendarGrid({ year, month, todayKey, items, catById, selectedDate, onSelectDate, onOpenTask }: {
  year: number;
  month: number;
  todayKey: string;
  items: Record<string, Task[]>;
  catById: Record<string, TaskCategory>;
  selectedDate: string | null;
  onSelectDate: (key: string) => void;
  onOpenTask: (id: string) => void;
}) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startPad = first.getDay(); // Sunday-first, native for he-IL
  const cells: (number | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
        {HE_WEEKDAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#4A6076", padding: "4px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={i} style={{ minHeight: 74, borderRadius: 12, background: "transparent" }} />;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTasks = items[key] ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          return (
            <div
              key={i}
              onClick={() => onSelectDate(key)}
              style={{
                minHeight: 74, borderRadius: 12, padding: "5px 6px", cursor: "pointer",
                background: isSelected ? "#CCFBF1" : isToday ? "#DBEAFE" : "#F7FBFC",
                border: `1px solid ${isSelected ? "#14B8A6" : isToday ? "#2563EB" : "rgba(15,37,64,0.06)"}`,
                display: "flex", flexDirection: "column", gap: 3, overflow: "hidden",
              }}
            >
              <span className="num" style={{
                fontSize: 11.5, fontWeight: isToday ? 700 : 500,
                color: isToday ? "#1E40AF" : "#4A6076",
              }}>
                {day}
              </span>
              {dayTasks.slice(0, 3).map((t) => {
                const c = t.categoryId ? catById[t.categoryId]?.color : undefined;
                const col = t.critical ? "#EF4444" : (c ?? "#0EA5E9");
                return (
                  <button
                    key={t.id}
                    onClick={(e) => { e.stopPropagation(); onOpenTask(t.id); }}
                    title={t.title}
                    style={{
                      display: "block", width: "100%", textAlign: "start",
                      background: `${col}1C`, color: col, border: "none",
                      borderInlineStart: `3px solid ${col}`,
                      borderRadius: 6, padding: "2px 5px", fontSize: 10, fontWeight: 600,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      cursor: "pointer", fontFamily: "inherit",
                      textDecoration: t.done ? "line-through" : "none",
                    }}
                  >
                    {t.critical ? "🔥 " : ""}{t.title || "ללא שם"}
                  </button>
                );
              })}
              {dayTasks.length > 3 && (
                <span style={{ fontSize: 9.5, color: "#4A6076" }}>‎+{dayTasks.length - 3} נוספות</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

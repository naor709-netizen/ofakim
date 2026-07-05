"use client";

// ============================================
// יומן המשימות של אופיר — data layer (localStorage)
// ============================================

export type TaskNature = "personal" | "urgent" | "routine";

export const NATURE_LABELS: Record<TaskNature, string> = {
  personal: "אישי",
  urgent: "דחוף",
  routine: "שוטף",
};

export const NATURE_COLORS: Record<TaskNature, string> = {
  personal: "#8B5CF6",
  urgent: "#EF4444",
  routine: "#0EA5E9",
};

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
}

export interface TaskFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface TaskReminder {
  id: string;
  datetime: string; // ISO
  note: string;
  fired: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string; // מהות המשימה
  notes: string;
  categoryId: string | null;
  nature: TaskNature | null;
  critical: boolean;
  createdAt: string; // ISO — תאריך פתיחה
  dueDate: string | null; // YYYY-MM-DD — יעד, מוצג בלוח השנה
  endDate: string | null; // YYYY-MM-DD — תאריך סיום
  done: boolean;
  reminders: TaskReminder[];
  files: TaskFile[];
  subtasks: Task[]; // שלבים — לכל שלב כל מאפייני משימה
}

export interface JournalData {
  categories: TaskCategory[];
  tasks: Task[];
}

const STORAGE_KEY = "ofir-task-journal";

export const DEFAULT_CATEGORIES: TaskCategory[] = [
  { id: "work", name: "עבודה", color: "#2563EB" },
  { id: "home", name: "בית", color: "#14B8A6" },
  { id: "meetings", name: "פגישות", color: "#0EA5E9" },
  { id: "errands", name: "סידורים", color: "#F59E0B" },
];

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function emptyTask(): Task {
  return {
    id: uid(),
    title: "",
    description: "",
    notes: "",
    categoryId: null,
    nature: null,
    critical: false,
    createdAt: new Date().toISOString(),
    dueDate: null,
    endDate: null,
    done: false,
    reminders: [],
    files: [],
    subtasks: [],
  };
}

export function loadJournal(): JournalData {
  if (typeof window === "undefined") {
    return { categories: DEFAULT_CATEGORIES, tasks: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { categories: DEFAULT_CATEGORIES, tasks: [] };
    const parsed = JSON.parse(raw) as JournalData;
    return {
      categories: parsed.categories ?? DEFAULT_CATEGORIES,
      tasks: (parsed.tasks ?? []).map(normalizeTask),
    };
  } catch {
    return { categories: DEFAULT_CATEGORIES, tasks: [] };
  }
}

function normalizeTask(t: Partial<Task>): Task {
  return { ...emptyTask(), ...t, subtasks: (t.subtasks ?? []).map(normalizeTask) };
}

export function saveJournal(data: JournalData): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    // quota exceeded (קבצים גדולים מדי)
    return false;
  }
}

// --- store for useSyncExternalStore ---

let snapshot: JournalData | null = null;
const listeners = new Set<() => void>();

export function subscribeJournal(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getJournalSnapshot(): JournalData | null {
  if (snapshot === null && typeof window !== "undefined") snapshot = loadJournal();
  return snapshot;
}

export function getServerJournalSnapshot(): JournalData | null {
  return null;
}

export function setJournalData(next: JournalData): boolean {
  snapshot = next;
  const ok = saveJournal(next);
  listeners.forEach((l) => l());
  return ok;
}

// --- tree helpers — subtasks are full tasks, recursively ---

export function updateTaskInTree(tasks: Task[], id: string, patch: Partial<Task>): Task[] {
  return tasks.map((t) => {
    if (t.id === id) return { ...t, ...patch };
    if (t.subtasks.length) return { ...t, subtasks: updateTaskInTree(t.subtasks, id, patch) };
    return t;
  });
}

export function replaceTaskInTree(tasks: Task[], updated: Task): Task[] {
  return tasks.map((t) => {
    if (t.id === updated.id) return updated;
    if (t.subtasks.length) return { ...t, subtasks: replaceTaskInTree(t.subtasks, updated) };
    return t;
  });
}

export function removeTaskFromTree(tasks: Task[], id: string): Task[] {
  return tasks
    .filter((t) => t.id !== id)
    .map((t) => (t.subtasks.length ? { ...t, subtasks: removeTaskFromTree(t.subtasks, id) } : t));
}

export function findTaskInTree(tasks: Task[], id: string): Task | null {
  for (const t of tasks) {
    if (t.id === id) return t;
    const found = findTaskInTree(t.subtasks, id);
    if (found) return found;
  }
  return null;
}

export function flattenTasks(tasks: Task[]): Task[] {
  const out: Task[] = [];
  const walk = (list: Task[]) => {
    for (const t of list) {
      out.push(t);
      walk(t.subtasks);
    }
  };
  walk(tasks);
  return out;
}

export function countSubtasks(t: Task): { total: number; done: number } {
  const flat = flattenTasks(t.subtasks);
  return { total: flat.length, done: flat.filter((s) => s.done).length };
}

// --- date helpers ---

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateHe(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric" });
}

export function formatDateTimeHe(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export const HE_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export const HE_WEEKDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export const CATEGORY_COLOR_CHOICES = [
  "#2563EB", "#0EA5E9", "#06B6D4", "#14B8A6", "#10B981", "#34D399",
  "#8B5CF6", "#D946EF", "#EC4899", "#EF4444", "#F97316", "#F59E0B",
  "#84CC16", "#64748B", "#1E3A5F", "#0F766E",
];

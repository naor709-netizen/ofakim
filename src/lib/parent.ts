"use client";

export interface Child {
  id: string;
  name: string;
  grade: string;
}

export interface ParentProfile {
  familyName: string;
  neighborhood: string;
  children: Child[];
  interests: string[];
  notifications: {
    whatsapp: boolean;
    emailWeekly: boolean;
    reminders: boolean;
  };
  email?: string;
  phone?: string;
}

export const GRADES = [
  "גן", "טרום-חובה", "חובה",
  "א'", "ב'", "ג'", "ד'", "ה'", "ו'",
  "ז'", "ח'", "ט'",
  "י'", "יא'", "יב'",
];

export const INTEREST_AREAS = [
  { id: "early",       label: "גיל הרך",         icon: "🧸" },
  { id: "elementary",  label: "חינוך יסודי",     icon: "📚" },
  { id: "secondary",   label: "על-יסודי",         icon: "🎓" },
  { id: "camps",       label: "קייטנות וחופשות",  icon: "🏖" },
  { id: "sports",      label: "ספורט",           icon: "⚽" },
  { id: "arts",        label: "אומנות ויצירה",   icon: "🎨" },
  { id: "music",       label: "מוזיקה",          icon: "🎵" },
  { id: "youth",       label: "תנועות נוער",     icon: "🏕" },
  { id: "social",      label: "מעורבות חברתית",  icon: "🤝" },
  { id: "family",      label: "אירועי משפחה",    icon: "👨‍👩‍👧" },
];

const KEY = "ofakim-parent-profile";

export function saveProfile(profile: ParentProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function loadProfile(): ParentProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

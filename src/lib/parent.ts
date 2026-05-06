"use client";

import { supabase } from "./supabase";

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

// =====================================================
// localStorage — used as draft cache before login,
// or as offline fallback. The DB is the source of truth.
// =====================================================
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

// =====================================================
// Supabase — authoritative storage per logged-in resident
// =====================================================
type DbProfile = {
  user_id: string;
  family_name: string;
  neighborhood: string | null;
  children: Child[];
  interests: string[];
  notifications: ParentProfile["notifications"];
  email: string | null;
  phone: string | null;
};

function fromDb(row: DbProfile): ParentProfile {
  return {
    familyName:    row.family_name,
    neighborhood:  row.neighborhood ?? "",
    children:      row.children ?? [],
    interests:     row.interests ?? [],
    notifications: row.notifications ?? { whatsapp: true, emailWeekly: true, reminders: false },
    email:         row.email ?? undefined,
    phone:         row.phone ?? undefined,
  };
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function fetchProfile(): Promise<ParentProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("parent_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  const profile = fromDb(data as DbProfile);
  saveProfile(profile); // sync local cache
  return profile;
}

export async function upsertProfile(profile: ParentProfile): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "not_authenticated" };
  const { error } = await supabase.from("parent_profiles").upsert({
    user_id:       user.id,
    family_name:   profile.familyName,
    neighborhood:  profile.neighborhood || null,
    children:      profile.children,
    interests:     profile.interests,
    notifications: profile.notifications,
    email:         profile.email || user.email || null,
    phone:         profile.phone || null,
  }, { onConflict: "user_id" });
  if (error) return { ok: false, error: error.message };
  saveProfile(profile);
  return { ok: true };
}

export async function signOutResident() {
  await supabase.auth.signOut();
  clearProfile();
}

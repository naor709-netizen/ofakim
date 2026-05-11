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

const LOCAL_KEY = "ofakim-parent-profile";

type DbRow = {
  user_id: string;
  email: string | null;
  family_name: string;
  neighborhood: string | null;
  children: Child[];
  interests: string[];
  notifications: ParentProfile["notifications"];
  phone: string | null;
};

function rowToProfile(r: DbRow): ParentProfile {
  return {
    familyName: r.family_name,
    neighborhood: r.neighborhood ?? "",
    children: r.children ?? [],
    interests: r.interests ?? [],
    notifications: r.notifications ?? { whatsapp: true, emailWeekly: true, reminders: false },
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
  };
}

export async function getParentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function loadProfile(): Promise<ParentProfile | null> {
  const user = await getParentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("parent_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToProfile(data as DbRow);
}

export async function saveProfile(profile: ParentProfile): Promise<{ error: string | null }> {
  const user = await getParentUser();
  if (!user) return { error: "not-authenticated" };
  const { error } = await supabase
    .from("parent_profiles")
    .upsert({
      user_id:       user.id,
      email:         profile.email ?? user.email ?? null,
      family_name:   profile.familyName,
      neighborhood:  profile.neighborhood || null,
      children:      profile.children,
      interests:     profile.interests,
      notifications: profile.notifications,
      phone:         profile.phone || null,
    }, { onConflict: "user_id" });
  return { error: error?.message ?? null };
}

export async function clearProfile(): Promise<void> {
  const user = await getParentUser();
  if (!user) return;
  await supabase.from("parent_profiles").delete().eq("user_id", user.id);
}

export async function signOutParent() {
  await supabase.auth.signOut();
}

export function readLocalDraft(): ParentProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearLocalDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_KEY);
}

export async function migrateLocalDraftIfAny(): Promise<boolean> {
  const draft = readLocalDraft();
  if (!draft) return false;
  const existing = await loadProfile();
  if (existing) { clearLocalDraft(); return false; }
  const { error } = await saveProfile(draft);
  if (!error) clearLocalDraft();
  return !error;
}

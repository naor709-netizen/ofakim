"use client";

import { supabase } from "./supabase";

export type AppUser = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "staff";
  department: "education" | "youth" | null;
  active: boolean;
  avatar_url: string | null;
};

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("email", email.toLowerCase())
    .maybeSingle();
  if (error || !data) return null;
  return data as AppUser;
}

export async function getAllUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("department")
    .order("full_name");
  if (error) return [];
  return (data || []) as AppUser[];
}

export async function createUser(p: {
  email: string;
  full_name: string;
  role: "admin" | "staff";
  department: "education" | "youth" | null;
  active?: boolean;
}) {
  return supabase.from("users").insert({
    email:      p.email.toLowerCase(),
    full_name:  p.full_name,
    role:       p.role,
    department: p.department,
    active:     p.active ?? false,
  }).select().single();
}

export async function updateUser(id: string, p: Partial<AppUser>) {
  return supabase.from("users").update(p).eq("id", id).select().single();
}

export async function deleteUser(id: string) {
  return supabase.from("users").delete().eq("id", id);
}

// =====================================================
// סשן מקומי (פשוט, עד שיש Supabase Auth מלא עם OAuth)
// =====================================================
const SESSION_KEY = "ofakim-session";

export function saveSession(user: AppUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  // עדכון last_login_at
  supabase.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id).then(() => {});
}

export function loadSession(): AppUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

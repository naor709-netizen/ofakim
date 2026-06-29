import { supabase } from "./supabase";
import type { Event as DemoEvent, CategoryId } from "./data";

export type DbCategory = {
  id: string;
  name: string;
  department: "education" | "youth";
  color: string;
  display_order: number;
};

export type DbEvent = {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  start_month: number;
  end_month: number;
  start_day: number | null;
  end_day: number | null;
  start_year: number | null;
  end_year: number | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  age_groups: string[];
  responsible: string | null;
  status: "draft" | "published" | "cancelled";
  created_at: string;
  updated_at: string;
  categories?: DbCategory;
};

export async function getCategories(): Promise<DbCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("department")
    .order("display_order");
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function getEvents(): Promise<DbEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*, categories(*)")
    .eq("status", "published")
    .order("start_month");
  if (error) { console.error(error); return []; }
  return (data as DbEvent[]) || [];
}

export async function createEvent(payload: {
  name: string;
  category_id: string;
  start_month: number;
  end_month: number;
  start_day?: number | null;
  end_day?: number | null;
  start_year?: number | null;
  end_year?: number | null;
  age_groups?: string[];
  location?: string | null;
  responsible?: string | null;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}) {
  return supabase.from("events").insert({
    name:        payload.name,
    category_id: payload.category_id,
    start_month: payload.start_month,
    end_month:   payload.end_month,
    start_day:   payload.start_day ?? null,
    end_day:     payload.end_day   ?? null,
    start_year:  payload.start_year ?? null,
    end_year:    payload.end_year   ?? null,
    age_groups:  payload.age_groups ?? [],
    location:    payload.location   ?? null,
    responsible: payload.responsible ?? null,
    description: payload.description ?? null,
    start_time:  payload.start_time ?? null,
    end_time:    payload.end_time   ?? null,
    status:      "published",
  }).select("*, categories(*)").single();
}

export async function updateEvent(id: string, payload: {
  name?: string;
  category_id?: string;
  start_month?: number;
  end_month?: number;
  start_day?: number | null;
  end_day?: number | null;
  start_year?: number | null;
  end_year?: number | null;
  age_groups?: string[];
  location?: string | null;
  responsible?: string | null;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}) {
  return supabase.from("events").update(payload).eq("id", id).select("*, categories(*)").single();
}

export async function deleteEvent(id: string) {
  return supabase.from("events").delete().eq("id", id);
}

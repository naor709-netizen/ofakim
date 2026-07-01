import { supabase } from "./supabase";
import type { Event as DemoEvent, CategoryId } from "./data";

export type CategoryDept = "education" | "youth" | "both";

export type DbCategory = {
  id: string;
  name: string;
  department: CategoryDept;
  color: string;
  display_order: number;
};

export type DbEvent = {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  category_ids: string[];
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
  image_url: string | null;
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
  category_id?: string;
  category_ids?: string[];
  start_month: number;
  end_month: number;
  start_day?: number | null;
  end_day?: number | null;
  start_year?: number | null;
  end_year?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  age_groups?: string[];
  location?: string | null;
  responsible?: string | null;
  description?: string | null;
  image_url?: string | null;
}) {
  const cats = (payload.category_ids && payload.category_ids.length > 0)
    ? payload.category_ids
    : (payload.category_id ? [payload.category_id] : []);
  return supabase.from("events").insert({
    name:         payload.name,
    category_id:  cats[0] || null,
    category_ids: cats,
    start_month:  payload.start_month,
    end_month:    payload.end_month,
    start_day:    payload.start_day ?? null,
    end_day:      payload.end_day   ?? null,
    start_year:   payload.start_year ?? null,
    end_year:     payload.end_year   ?? null,
    start_time:   payload.start_time ?? null,
    end_time:     payload.end_time   ?? null,
    age_groups:   payload.age_groups ?? [],
    location:     payload.location   ?? null,
    responsible:  payload.responsible ?? null,
    description:  payload.description ?? null,
    image_url:    payload.image_url ?? null,
    status:       "published",
  }).select("*, categories(*)").single();
}

export async function updateEvent(id: string, payload: {
  name?: string;
  category_id?: string;
  category_ids?: string[];
  start_month?: number;
  end_month?: number;
  start_day?: number | null;
  end_day?: number | null;
  start_year?: number | null;
  end_year?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  age_groups?: string[];
  location?: string | null;
  responsible?: string | null;
  description?: string | null;
  image_url?: string | null;
}) {
  const finalPayload: Record<string, unknown> = { ...payload };
  if (payload.category_ids && payload.category_ids.length > 0) {
    finalPayload.category_ids = payload.category_ids;
    finalPayload.category_id  = payload.category_ids[0];
  } else if (payload.category_id) {
    finalPayload.category_id  = payload.category_id;
    finalPayload.category_ids = [payload.category_id];
  }
  return supabase.from("events").update(finalPayload).eq("id", id).select("*, categories(*)").single();
}

export async function deleteEvent(id: string) {
  return supabase.from("events").delete().eq("id", id);
}

const POSTER_BUCKET = "event-posters";

export async function uploadEventPoster(file: File): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(POSTER_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from(POSTER_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export async function createCategory(payload: {
  name: string;
  department: CategoryDept;
  color: string;
  display_order?: number;
}) {
  return supabase.from("categories").insert({
    name: payload.name,
    department: payload.department,
    color: payload.color,
    display_order: payload.display_order ?? 99,
  }).select().single();
}

export async function updateCategory(id: string, payload: {
  name?: string;
  department?: CategoryDept;
  color?: string;
  display_order?: number;
}) {
  return supabase.from("categories").update(payload).eq("id", id).select().single();
}

export async function deleteCategory(id: string) {
  return supabase.from("categories").delete().eq("id", id);
}

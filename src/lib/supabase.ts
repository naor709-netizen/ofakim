import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lazy proxy: avoid throwing at module load when env vars are missing
// (e.g. during `next build` page-data collection). The real client is
// created on first property access, by which time env vars should exist
// at runtime or the caller will get an explicit error.
let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!_client) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }
    _client = createClient(supabaseUrl, supabaseKey);
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});

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
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  age_groups: string[];
  responsible: string | null;
  registration_link: string | null;
  notes: string | null;
  status: "draft" | "published" | "cancelled";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbCategory = {
  id: string;
  name: string;
  department: "education" | "youth" | "both";
  color: string;
  display_order: number;
};

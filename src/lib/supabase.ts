import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

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

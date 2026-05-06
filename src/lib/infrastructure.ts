import { supabase } from "./supabase";

export type Infrastructure = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  capacity: number | null;
  age_range: string | null;
  description: string | null;
  active: boolean;
};

export async function getInfrastructures() {
  const { data, error } = await supabase.from("infrastructures").select("*").order("name");
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function createInfrastructure(p: Partial<Infrastructure> & { name: string; type: string }) {
  return supabase.from("infrastructures").insert(p).select().single();
}

export async function updateInfrastructure(id: string, p: Partial<Infrastructure>) {
  return supabase.from("infrastructures").update(p).eq("id", id).select().single();
}

export async function deleteInfrastructure(id: string) {
  return supabase.from("infrastructures").delete().eq("id", id);
}

// היסטוריית שינויים
export type AuditEntry = {
  id: string;
  user_name: string | null;
  event_id: string | null;
  event_name: string | null;
  action: "create" | "update" | "delete";
  department: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export async function getAuditLog(limit = 50) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) { console.error(error); return []; }
  return (data || []) as AuditEntry[];
}

export async function logAudit(entry: {
  user_name?: string | null;
  event_id?: string | null;
  event_name?: string | null;
  action: "create" | "update" | "delete";
  department?: string | null;
  details?: Record<string, unknown> | null;
}) {
  await supabase.from("audit_log").insert(entry);
}

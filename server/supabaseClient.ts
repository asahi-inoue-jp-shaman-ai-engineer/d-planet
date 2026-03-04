import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("[Supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface DevMailMessage {
  id?: number;
  from_agent: string;
  to_agent: string;
  subject: string;
  content: string;
  message_type: "memo" | "review_request" | "spec_draft" | "decision" | "question";
  status: "unread" | "read" | "actioned";
  priority: "low" | "normal" | "high" | "critical";
  related_context?: Record<string, unknown>;
  created_at?: string;
  read_at?: string | null;
}

export interface DevSpec {
  id?: number;
  title: string;
  content: string;
  status: "draft" | "review" | "approved" | "implemented";
  created_by: string;
  reviewed_by?: string[];
  hayroom_session_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DevSession {
  id?: number;
  session_by: string;
  session_date?: string;
  summary: string;
  decisions?: unknown[];
  next_actions?: unknown[];
  related_spec_ids?: number[];
}

export async function getUnreadMail(agentName: string): Promise<DevMailMessage[]> {
  const { data, error } = await supabase
    .from("dev_mailbox")
    .select("*")
    .or(`to_agent.eq.${agentName},to_agent.eq.ALL`)
    .eq("status", "unread")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Supabase] getUnreadMail error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function sendMail(msg: Omit<DevMailMessage, "id" | "status" | "created_at" | "read_at">): Promise<DevMailMessage | null> {
  const { data, error } = await supabase
    .from("dev_mailbox")
    .insert({ ...msg, status: "unread" })
    .select()
    .single();

  if (error) {
    console.error("[Supabase] sendMail error:", error.message);
    return null;
  }
  return data;
}

export async function markMailRead(mailId: number): Promise<void> {
  const { error } = await supabase
    .from("dev_mailbox")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", mailId);

  if (error) {
    console.error("[Supabase] markMailRead error:", error.message);
  }
}

export async function saveSpec(spec: Omit<DevSpec, "id" | "created_at" | "updated_at">): Promise<DevSpec | null> {
  const { data, error } = await supabase
    .from("dev_specs")
    .insert(spec)
    .select()
    .single();

  if (error) {
    console.error("[Supabase] saveSpec error:", error.message);
    return null;
  }
  return data;
}

export async function getSpecs(status?: string): Promise<DevSpec[]> {
  let query = supabase
    .from("dev_specs")
    .select("*")
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.limit(20);

  if (error) {
    console.error("[Supabase] getSpecs error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function saveSession(session: Omit<DevSession, "id" | "session_date">): Promise<DevSession | null> {
  const { data, error } = await supabase
    .from("dev_sessions")
    .insert(session)
    .select()
    .single();

  if (error) {
    console.error("[Supabase] saveSession error:", error.message);
    return null;
  }
  return data;
}

export async function getRecentSessions(limit = 5): Promise<DevSession[]> {
  const { data, error } = await supabase
    .from("dev_sessions")
    .select("*")
    .order("session_date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Supabase] getRecentSessions error:", error.message);
    return [];
  }
  return data ?? [];
}

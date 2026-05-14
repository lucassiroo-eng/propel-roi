import { createClient } from "@supabase/supabase-js";

const ATLAS_URL = "https://bqoepgcdgqylobkmqdur.supabase.co";
const ATLAS_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxb2VwZ2NkZ3F5bG9ia21xZHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTUyMzQsImV4cCI6MjA5MzgzMTIzNH0.FXajdSSsz6BgX9RJ_UVgy7q_9cavJdQWP1PHX9_zVhk";

export const atlas = createClient(ATLAS_URL, ATLAS_KEY);

export function extractDealIdFromUrl(url: string): string | null {
  const m = url.match(/\/deal\/(\d+)/);
  return m ? m[1] : null;
}

export interface AtlasCompany {
  id: string;
  crm_id: string;
  company_name: string;
  company_size: string;
  country: string;
  industry: string;
  website: string;
  description: string;
  company_info: string;
  company_context: string;
  contacts_breakdown: string;
  deal_history: string;
  contacts_map: string;
}

export interface AtlasDeal {
  id: string;
  deal_id: string;
  atlas_id: string;
  crm_id: string;
  deal_name: string;
  amount: number | null;
  deal_stage: string;
  close_date: string | null;
  contacts_info: string;
  pbd: string;
  pae: string;
  deal_context: string;
  numero_de_notas: number;
  numero_de_emails: number;
  numero_de_calls: number;
}

export async function fetchDealByHubspotId(dealId: string): Promise<AtlasDeal | null> {
  const { data, error } = await atlas
    .from("deals")
    .select("*")
    .eq("deal_id", dealId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as AtlasDeal;
}

export async function fetchAtlasCompany(atlasId: string): Promise<AtlasCompany | null> {
  const { data, error } = await atlas
    .from("atlas")
    .select("*")
    .eq("id", atlasId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as AtlasCompany;
}

export async function fetchAtlasCompanyByCrmId(crmId: string): Promise<AtlasCompany | null> {
  const { data, error } = await atlas
    .from("atlas")
    .select("*")
    .eq("crm_id", crmId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as AtlasCompany;
}

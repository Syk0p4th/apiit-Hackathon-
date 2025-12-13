"use client";

import { createClient } from "@supabase/supabase-js";

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (typeof window === "undefined") {
    return null;
  }
  
  if (supabaseInstance) return supabaseInstance;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables not set:", {
      url: supabaseUrl ? "set" : "missing",
      key: supabaseAnonKey ? "set" : "missing",
    });
    return null;
  }
  
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  console.log(supabaseInstance)
  return supabaseInstance;
}

// Lazy initialization - will be called from useEffect in client components
export const supabase = null;
export default supabase;
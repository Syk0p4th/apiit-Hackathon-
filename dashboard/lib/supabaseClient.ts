"use client";

import { createClient } from "@supabase/supabase-js";

// Create the Supabase client directly - it will work in the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("[supabaseClient] Initializing with URL:", supabaseUrl);
console.log("[supabaseClient] Anon key present:", !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Missing Supabase environment variables. URL: ${!supabaseUrl ? "MISSING" : "set"}, Key: ${!supabaseAnonKey ? "MISSING" : "set"}`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getSupabaseClient() {
  return supabase;
}

export default supabase;
import { createClient } from "@supabase/supabase-js";

//Get environment variables for supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

//Create supabase client using variables
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from '@supabase/supabase-js';

//Get environment variables for supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

//Create the supabase client with the variables
export const supabase = createClient(supabaseUrl, supabaseKey);
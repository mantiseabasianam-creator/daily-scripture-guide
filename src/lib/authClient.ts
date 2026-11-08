import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ncyeccycuwxvvbmtgesq.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_rTMncbDZo_QlggevW3F75g_2t4DW3a8";

export const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {

  auth: {

    persistSession: true,

    autoRefreshToken: true,

    detectSessionInUrl: true,

  },

});
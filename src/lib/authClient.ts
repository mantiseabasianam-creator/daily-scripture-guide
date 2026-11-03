import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// ============================================================
// SUPABASE CONNECTION SETTINGS
// ------------------------------------------------------------
// These two values are this app's own backend connection details.
// They are the PUBLIC browser credentials (project URL +
// anon/publishable key) and are safe to ship in client code.
// To point the app at a different backend, replace them here.
// ============================================================
export const SUPABASE_URL = "https://lhsygenwhvdkyjjuhkes.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_Hiar6Gm5YKH-fM7GWJG6pQ_nJtAY_Mt";

/**
 * The auth client used by the sign-up, login, session and sign-out flows.
 * Sessions persist across refreshes, refresh automatically, and are picked
 * up from the URL when an OAuth provider (e.g. Google) redirects back.
 */
export const authClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

let initialized = false;

/**
 * Attach the app-wide SIGNED_IN listener: keeps the logged-in user in sync
 * and makes sure a profile row exists for the user (sign-up and first
 * sign-in alike). The upsert never overwrites an existing profile.
 * Call once from the app root, on the client.
 */
export function initAuthClient() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  authClient.auth.onAuthStateChange((event, session) => {
    if (event !== "SIGNED_IN" || !session?.user) return;
    void ensureProfile(session.user);
  });
}

type UserMetadata = {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string;
};

async function ensureProfile(user: { id: string; user_metadata?: UserMetadata }) {
  const meta = user.user_metadata ?? {};
  const [fullNameFirst = "", ...fullNameRest] = (meta.full_name ?? meta.name ?? "").split(" ");
  const firstName = meta.first_name || fullNameFirst || null;
  const lastName = meta.last_name || fullNameRest.join(" ") || null;

  // ignoreDuplicates: create the row only if it doesn't exist yet, so a
  // returning user's profile is never overwritten or duplicated.
  const { error } = await authClient
    .from("profiles")
    .upsert(
      { id: user.id, first_name: firstName, last_name: lastName },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) console.error("Could not create the user profile", error.message);
}

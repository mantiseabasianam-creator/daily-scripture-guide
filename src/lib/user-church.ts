import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CHURCH_TRADITIONS, NATIONS } from "@/lib/church-directory";

export const DEFAULT_DENOMINATION: string = CHURCH_TRADITIONS[0];
export const DEFAULT_NATION: string = NATIONS[0];

/** The user's saved church tradition + nation, loaded once per page. */
export function useUserChurch() {
  const [denomination, setDenomination] = useState<string>(DEFAULT_DENOMINATION);
  const [nation, setNation] = useState<string>(DEFAULT_NATION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const savedChurch = data.user?.user_metadata['church'];
      const savedNation = data.user?.user_metadata['nation'];
      if (
        typeof savedChurch === "string" &&
        (CHURCH_TRADITIONS as readonly string[]).includes(savedChurch)
      ) {
        setDenomination(savedChurch);
      }
      if (typeof savedNation === "string" && (NATIONS as readonly string[]).includes(savedNation)) {
        setNation(savedNation);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { denomination, nation, setDenomination, setNation, loading };
}

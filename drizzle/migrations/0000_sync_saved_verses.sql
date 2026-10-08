CREATE TABLE public.saved_verses (
  user_id UUID NOT NULL,
  verse_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  text TEXT NOT NULL,
  translation TEXT NOT NULL,
  bookmarked BOOLEAN NOT NULL DEFAULT false,
  highlight TEXT,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, verse_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_verses TO authenticated;
GRANT ALL ON public.saved_verses TO service_role;

ALTER TABLE public.saved_verses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their saved verses" ON public.saved_verses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their saved verses" ON public.saved_verses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their saved verses" ON public.saved_verses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their saved verses" ON public.saved_verses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TABLE public.bible_versions (
  id text PRIMARY KEY,
  "bibleId" text NOT NULL UNIQUE,
  name text NOT NULL,
  abbreviation text NOT NULL,
  language text NOT NULL,
  testament_complete boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bible_versions TO anon;
GRANT SELECT ON public.bible_versions TO authenticated;
GRANT ALL ON public.bible_versions TO service_role;

ALTER TABLE public.bible_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bible versions are publicly readable"
  ON public.bible_versions FOR SELECT TO anon, authenticated USING (true);
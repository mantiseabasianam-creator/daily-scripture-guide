CREATE TABLE public.church_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  denomination text NOT NULL,
  nation text,
  event_key text NOT NULL,
  event_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  note text,
  category text NOT NULL DEFAULT 'Seasonal',
  date_type text NOT NULL CHECK (date_type IN ('fixed','recurring_sunday','easter')),
  recurrence_rule text,
  fixed_date text,
  time_label text NOT NULL DEFAULT '10:00 AM',
  rule_label text NOT NULL DEFAULT '',
  is_editable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX church_events_unique_key
  ON public.church_events (denomination, event_key, COALESCE(nation, '*'));

GRANT SELECT ON public.church_events TO anon;
GRANT SELECT ON public.church_events TO authenticated;
GRANT ALL ON public.church_events TO service_role;

ALTER TABLE public.church_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Church events are publicly readable"
  ON public.church_events FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER update_church_events_updated_at
  BEFORE UPDATE ON public.church_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.event_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  church_event_id uuid REFERENCES public.church_events(id) ON DELETE SET NULL,
  event_key text,
  denomination text,
  nation text,
  event_name text NOT NULL,
  current_date_label text,
  suggested_date text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.event_corrections TO authenticated;
GRANT ALL ON public.event_corrections TO service_role;

ALTER TABLE public.event_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own corrections"
  ON public.event_corrections FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can submit corrections"
  ON public.event_corrections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_event_corrections_updated_at
  BEFORE UPDATE ON public.event_corrections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- General observances for every denomination
INSERT INTO public.church_events
  (denomination, nation, event_key, event_name, description, note, category, date_type, recurrence_rule, fixed_date, time_label, rule_label, is_editable)
SELECT d.denomination, e.nation, e.event_key, e.event_name, e.description, e.note, e.category, e.date_type, e.recurrence_rule, e.fixed_date, e.time_label, e.rule_label, e.is_editable
FROM (VALUES
  ('Presbyterian'),('Catholic'),('Apostolic'),('Baptist'),('Assemblies of God'),('Methodist'),('Non-denominational')
) AS d(denomination)
CROSS JOIN (VALUES
  (NULL::text,'ash-wednesday','Ash Wednesday','The season of Lent opens with the imposition of ashes, Scripture reading, and a call to repentance and fasting.','Observed where the church keeps Lent.','Seasonal','easter','offset:-46',NULL,'6:00 PM','Wednesday 46 days before Easter, every year',true),
  (NULL,'palm-sunday','Palm Sunday','Holy Week begins with the procession of palms and the reading of Christ''s triumphal entry into Jerusalem.',NULL,'Seasonal','easter','offset:-7',NULL,'10:00 AM','Sunday before Easter, every year',true),
  (NULL,'good-friday','Good Friday Service','A reflective service on the crucifixion with the seven last words, Scripture readings, and quiet prayer.',NULL,'Seasonal','easter','offset:-2',NULL,'12:00 PM','Friday before Easter, every year',true),
  (NULL,'easter-sunday','Easter Sunday','Resurrection celebration with sunrise prayer, festive worship, and a message on the risen Christ.',NULL,'Seasonal','easter','offset:0',NULL,'9:00 AM','Easter Sunday, every year',true),
  (NULL,'pentecost-sunday','Pentecost Sunday','The outpouring of the Holy Spirit is celebrated with prayer for the church and a call to Spirit-filled witness.',NULL,'Seasonal','easter','offset:49',NULL,'10:00 AM','50 days after Easter, every year',true),
  (NULL,'harvest-thanksgiving','Harvest / Thanksgiving Sunday','A thanksgiving service of gratitude with harvest offerings, testimonies, and gifts shared with families in need.',NULL,'Seasonal','recurring_sunday','last:11',NULL,'10:00 AM','Last Sunday in November, every year',true),
  (NULL,'mothers-day','Mother''s Day Service','A celebration service honouring mothers in the congregation with special prayer, testimonies, and a family-focused message.',NULL,'Family','recurring_sunday','nth:5:2',NULL,'10:00 AM','2nd Sunday in May, every year',true),
  (NULL,'fathers-day','Father''s Day Service','A service of honour and encouragement for fathers and father figures, with prayer over households and men''s ministry highlights.',NULL,'Family','recurring_sunday','nth:6:3',NULL,'10:00 AM','3rd Sunday in June, every year',true),
  (NULL,'childrens-day','Children''s Day','Children lead worship, readings, and presentations, followed by games and a family lunch after service.','Local practice varies — congregations can move this date.','Family','recurring_sunday','nth:6:2',NULL,'9:30 AM','2nd Sunday in June, every year',true),
  ('Nigeria','childrens-day','Children''s Day','Children lead worship, readings, and presentations on Nigeria''s national Children''s Day.','Set to Nigeria''s national Children''s Day (May 27); congregations can adjust it.','Family','fixed',NULL,'05-27','9:30 AM','May 27, every year (Nigeria national Children''s Day)',true),
  (NULL,'christmas-carol','Christmas Carol Service','Nine lessons and carols by candlelight with the choir, congregational singing, and the Christmas Scripture readings.',NULL,'Seasonal','fixed',NULL,'12-24','6:00 PM','December 24, every year',true),
  (NULL,'christmas-day','Christmas Day Service','The birth of Christ is celebrated with worship, Scripture, and the Christmas message.','Some churches — for example the Presbyterian Church of Nigeria — hold a full Christmas Day service, not only a Christmas Eve service.','Seasonal','fixed',NULL,'12-25','9:00 AM','December 25, every year',true),
  (NULL,'watch-night','Watch Night Service','New Year''s Eve service of worship, thanksgiving, and prayer as the congregation crosses into the new year together.',NULL,'Seasonal','fixed',NULL,'12-31','10:00 PM','December 31, every year',true),
  (NULL,'communion-sunday','Communion Sunday','The Lord''s Supper is shared by the whole congregation, with a time of self-examination and prayer beforehand.',NULL,'Sacrament','recurring_sunday','monthly-nth:1',NULL,'10:00 AM','1st Sunday of every month',true),
  (NULL,'baptism-dedication','Baptism / Dedication Sunday','Believers are baptised and babies dedicated, with families welcomed and prayed for by the pastoral team.',NULL,'Sacrament','recurring_sunday','quarterly-last',NULL,'11:00 AM','Last Sunday of every quarter',true),
  (NULL,'founders-day','Anniversary / Founder''s Day','The church marks another year with thanksgiving, remembering its founding, and honouring long-serving members.',NULL,'Milestone','recurring_sunday','nth:9:1',NULL,'10:00 AM','1st Sunday in September, every year',true)
) AS e(nation,event_key,event_name,description,note,category,date_type,recurrence_rule,fixed_date,time_label,rule_label,is_editable);

-- Denomination-specific extras
INSERT INTO public.church_events
  (denomination, nation, event_key, event_name, description, note, category, date_type, recurrence_rule, fixed_date, time_label, rule_label, is_editable)
VALUES
  ('Catholic',NULL,'corpus-christi','Corpus Christi','Solemnity of the Most Holy Body and Blood of Christ, marked with Mass, adoration, and a eucharistic procession.',NULL,'Sacrament','easter','offset:60',NULL,'10:00 AM','Thursday after Trinity Sunday, every year',true),
  ('Catholic',NULL,'holy-family','Feast of the Holy Family','A Mass honouring the Holy Family with a blessing of households and family renewal of commitment.',NULL,'Family','fixed',NULL,'12-30','10:00 AM','December 30, every year',true),
  ('Catholic',NULL,'all-saints','All Saints'' Day','The whole communion of saints is remembered with Mass, litany, and prayers for the faithful departed.',NULL,'Milestone','fixed',NULL,'11-01','9:00 AM','November 1, every year',true),
  ('Assemblies of God',NULL,'crossover-night','Crossover Night','An all-night service of praise, prophecy, and prayer crossing into the new year.',NULL,'Seasonal','fixed',NULL,'12-31','9:00 PM','December 31, every year',true),
  ('Assemblies of God',NULL,'pentecost-emphasis','Pentecost Week Revival','A week of revival meetings around Pentecost with teaching on the baptism and gifts of the Holy Spirit.',NULL,'Seasonal','easter','offset:49',NULL,'6:00 PM','Pentecost week, every year',true),
  ('Apostolic',NULL,'crossover-night','Crossover Night','An all-night service of praise, prophecy, and prayer crossing into the new year.',NULL,'Seasonal','fixed',NULL,'12-31','9:00 PM','December 31, every year',true),
  ('Apostolic',NULL,'pentecost-emphasis','Pentecost Week Revival','A week of revival meetings around Pentecost with teaching on the baptism and gifts of the Holy Spirit.',NULL,'Seasonal','easter','offset:49',NULL,'6:00 PM','Pentecost week, every year',true),
  ('Non-denominational',NULL,'crossover-night','Crossover Night','An all-night service of praise, worship, and prayer crossing into the new year.',NULL,'Seasonal','fixed',NULL,'12-31','9:00 PM','December 31, every year',true),
  ('Methodist',NULL,'covenant-service','Covenant Renewal Service','The Wesleyan covenant prayer is renewed by the congregation at the start of the year.',NULL,'Milestone','recurring_sunday','nth:1:1',NULL,'10:00 AM','1st Sunday in January, every year',true),
  ('Presbyterian',NULL,'reformation-sunday','Reformation Sunday','A service remembering the Reformation with hymns, Scripture, and teaching on the church''s confessions.',NULL,'Milestone','recurring_sunday','last:10',NULL,'10:00 AM','Last Sunday in October, every year',true),
  ('Baptist',NULL,'missions-sunday','Missions Emphasis Sunday','Missionaries are commissioned and supported with a special offering and reports from the field.',NULL,'Milestone','recurring_sunday','nth:2:2',NULL,'10:00 AM','2nd Sunday in February, every year',true);
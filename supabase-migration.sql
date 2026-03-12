-- ============================================
-- BlogBooster: Firebase → Supabase Migration SQL
-- Supabase SQL Editor에서 실행
-- ============================================

-- Enable pgvector (이미 활성화되어 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 1. Profiles (users/{userId})
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  photo_url TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  login_history TIMESTAMPTZ[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admin can read all profiles" ON public.profiles FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin can update all profiles" ON public.profiles FOR UPDATE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin can delete all profiles" ON public.profiles FOR DELETE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ============================================
-- 2. Business Info (users/{userId}/businessInfo/current)
-- ============================================
CREATE TABLE IF NOT EXISTS public.business_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT '헬스장',
  business_name TEXT DEFAULT '',
  main_keyword TEXT DEFAULT '',
  sub_keywords TEXT[] DEFAULT '{}',
  tail_keywords TEXT[] DEFAULT '{}',
  target_audience TEXT DEFAULT '',
  unique_point TEXT DEFAULT '',
  attributes JSONB DEFAULT '{}',
  custom_attributes TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_info_user_id ON public.business_info(user_id);

ALTER TABLE public.business_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own business_info" ON public.business_info FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. Presets (users/{userId}/presets/{id})
-- ============================================
CREATE TABLE IF NOT EXISTS public.presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  business_name TEXT DEFAULT '',
  main_keyword TEXT DEFAULT '',
  sub_keywords TEXT[] DEFAULT '{}',
  tail_keywords TEXT[] DEFAULT '{}',
  target_audience TEXT DEFAULT '',
  unique_point TEXT DEFAULT '',
  attributes JSONB DEFAULT '{}',
  custom_attributes TEXT[] DEFAULT '{}',
  hidden_attributes TEXT[] DEFAULT '{}',
  attribute_labels JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presets_user_id ON public.presets(user_id);
CREATE INDEX IF NOT EXISTS idx_presets_created_at ON public.presets(user_id, created_at DESC);

ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own presets" ON public.presets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. Posts (users/{userId}/posts/{id})
-- ============================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  post_type TEXT NOT NULL,
  search_intent TEXT NOT NULL,
  main_keyword TEXT DEFAULT '',
  business_name TEXT DEFAULT '',
  image_prompts JSONB DEFAULT '[]',
  scheduled_at TIMESTAMPTZ,
  scheduled_status TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_type ON public.posts(user_id, post_type);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(user_id, created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own posts" ON public.posts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can read all posts" ON public.posts FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ============================================
-- 5. Subscriptions (users/{userId}/subscription/current)
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_plan TEXT NOT NULL DEFAULT 'FREE',
  plan_start_date TIMESTAMPTZ DEFAULT NOW(),
  plan_end_date TIMESTAMPTZ,
  blog_count INTEGER DEFAULT 0,
  image_analysis_count INTEGER DEFAULT 0,
  image_generation_count INTEGER DEFAULT 0,
  daily_paid_image_generation_count INTEGER DEFAULT 0,
  daily_image_generation_reset_date TIMESTAMPTZ,
  token_usage INTEGER DEFAULT 0,
  daily_token_usage INTEGER DEFAULT 0,
  daily_token_reset_date TIMESTAMPTZ,
  usage_reset_date TIMESTAMPTZ,
  last_payment_id TEXT,
  next_payment_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  auto_renew BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin can read all subscriptions" ON public.subscriptions FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin can update all subscriptions" ON public.subscriptions FOR UPDATE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ============================================
-- 6. User Settings (users/{userId}/settings/api + referenceText)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  api_provider TEXT DEFAULT 'gemini',
  api_key TEXT DEFAULT '',
  reference_text TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 7. Activity Logs (users/{userId}/activity/log)
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(user_id, created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own activity" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can read all activities" ON public.activity_logs FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ============================================
-- 8. Payments (payments/{id})
-- ============================================
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_key TEXT,
  amount INTEGER NOT NULL,
  method TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  plan TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  cancel_reason TEXT,
  cancel_amount INTEGER,
  toss_response JSONB,
  approved_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin can read all payments" ON public.payments FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ============================================
-- 9. Teams + Team Members (teams/{ownerId})
-- ============================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  owner_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id)
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'active',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON public.teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can CRUD own team" ON public.teams FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Members can read their team" ON public.teams FOR SELECT USING (id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "Owners can CRUD team members" ON public.team_members FOR ALL
  USING (team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid()))
  WITH CHECK (team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid()));
CREATE POLICY "Members can read own membership" ON public.team_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Members can leave team" ON public.team_members FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 10. SEO Schedules (users/{userId}/seoSchedule/current)
-- ============================================
CREATE TABLE IF NOT EXISTS public.seo_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL,
  last_published TIMESTAMPTZ,
  next_due TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_type)
);

CREATE INDEX IF NOT EXISTS idx_seo_schedules_user_id ON public.seo_schedules(user_id);

ALTER TABLE public.seo_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own seo_schedules" ON public.seo_schedules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 11. Keyword Usage (keyword_usage/{userId}_{date})
-- ============================================
CREATE TABLE IF NOT EXISTS public.keyword_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_keyword_usage_user_date ON public.keyword_usage(user_id, date);

ALTER TABLE public.keyword_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own keyword_usage" ON public.keyword_usage FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 12. Auto-update updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_info_updated_at BEFORE UPDATE ON public.business_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_presets_updated_at BEFORE UPDATE ON public.presets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seo_schedules_updated_at BEFORE UPDATE ON public.seo_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 13. Auto-create profile + subscription on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, photo_url, created_at, last_login_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    NOW(),
    NOW()
  );

  INSERT INTO public.subscriptions (user_id, current_plan, plan_start_date, plan_end_date, usage_reset_date)
  VALUES (
    NEW.id,
    'FREE',
    NOW(),
    NOW() + INTERVAL '1 month',
    NOW() + INTERVAL '1 month'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

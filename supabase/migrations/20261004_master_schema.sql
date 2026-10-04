-- ==============================================================================
-- FAST SPORTY AI — MIGRATION 20261004_master_schema.sql
-- Master specification schema update
-- ==============================================================================

-- 1. Table des Administrateurs (rôle géré exclusivement ici côté serveur)
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour admin_users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'Allow read own admin status') THEN
    CREATE POLICY "Allow read own admin status" ON public.admin_users
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 2. Table des Formules d'Abonnement (Plans)
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY, -- 'rookie', 'standard', 'premium'
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price_xaf INTEGER NOT NULL,
  included_coupon_types TEXT[] NOT NULL DEFAULT '{}',
  is_popular BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND policyname = 'Allow public read plans') THEN
    CREATE POLICY "Allow public read plans" ON public.plans
      FOR SELECT TO public
      USING (true);
  END IF;
END $$;

-- 3. Table des Types de Coupons
CREATE TABLE IF NOT EXISTS public.coupon_types (
  code TEXT PRIMARY KEY, -- 'SAFE', 'FUN', 'MONTANTE', 'PREMIUM'
  label_fr TEXT NOT NULL,
  label_en TEXT NOT NULL,
  description_fr TEXT,
  description_en TEXT,
  included_in_plans TEXT[] NOT NULL DEFAULT '{}',
  unlock_price_xaf INTEGER NOT NULL DEFAULT 0,
  is_extra BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0
);
ALTER TABLE public.coupon_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupon_types' AND policyname = 'Allow public read coupon_types') THEN
    CREATE POLICY "Allow public read coupon_types" ON public.coupon_types
      FOR SELECT TO public
      USING (true);
  END IF;
END $$;

-- 4. Table des Sélections de Coupons (normalisée)
CREATE TABLE IF NOT EXISTS public.coupon_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id TEXT NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  match_id TEXT,
  competition TEXT NOT NULL,
  home TEXT NOT NULL,
  away TEXT NOT NULL,
  kickoff_at TIMESTAMPTZ,
  market TEXT NOT NULL,
  pick TEXT NOT NULL,
  odds NUMERIC(5,2) NOT NULL,
  reasoning_fr TEXT,
  reasoning_en TEXT,
  result TEXT DEFAULT 'pending' CHECK (result IN ('pending', 'won', 'lost', 'void')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);
ALTER TABLE public.coupon_selections ENABLE ROW LEVEL SECURITY;

-- 5. Table des Étapes de Montante
CREATE TABLE IF NOT EXISTS public.coupon_montante_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id TEXT NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  step INTEGER NOT NULL, -- 1, 2, 3, 4, 5
  selection_id UUID REFERENCES public.coupon_selections(id) ON DELETE SET NULL,
  odds NUMERIC(5,2) NOT NULL,
  projected_amount_xaf INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void'))
);
ALTER TABLE public.coupon_montante_steps ENABLE ROW LEVEL SECURITY;

-- 6. Table des Paiements
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('plan', 'unlock', 'pack')),
  plan_id TEXT REFERENCES public.plans(id),
  coupon_id TEXT REFERENCES public.coupons(id),
  amount_xaf INTEGER NOT NULL,
  provider TEXT NOT NULL DEFAULT 'mock',
  provider_reference TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  paid_at TIMESTAMPTZ
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users can view own payments') THEN
    CREATE POLICY "Users can view own payments" ON public.payments
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 7. Table des Déblocages Individuels (coupon_unlocks)
CREATE TABLE IF NOT EXISTS public.coupon_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id TEXT NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('paid', 'gift', 'admin')),
  payment_id UUID REFERENCES public.payments(id),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  CONSTRAINT unique_user_coupon UNIQUE(user_id, coupon_id)
);
ALTER TABLE public.coupon_unlocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupon_unlocks' AND policyname = 'Users can view own unlocks') THEN
    CREATE POLICY "Users can view own unlocks" ON public.coupon_unlocks
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 8. Prompts & Runs IA (Grok)
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  status TEXT NOT NULL DEFAULT 'running',
  input_json JSONB,
  raw_output TEXT,
  error TEXT,
  tokens INTEGER,
  prompt_version INTEGER REFERENCES public.ai_prompts(version)
);
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;

-- 9. Paramètres Généraux (Settings)
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Allow public read settings') THEN
    CREATE POLICY "Allow public read settings" ON public.settings
      FOR SELECT TO public
      USING (true);
  END IF;
END $$;

-- 10. Diapositives & Statistiques Accueil
CREATE TABLE IF NOT EXISTS public.site_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index INTEGER DEFAULT 0,
  image_url TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  title_en TEXT,
  subtitle_fr TEXT,
  subtitle_en TEXT,
  cta_text_fr TEXT,
  cta_text_en TEXT,
  cta_action TEXT,
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE public.site_slides ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_slides' AND policyname = 'Allow public read site_slides') THEN
    CREATE POLICY "Allow public read site_slides" ON public.site_slides
      FOR SELECT TO public
      USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.site_stats (
  id TEXT PRIMARY KEY, -- 'subscribers', 'gain_cumulative', 'success_rate', 'xg_metrics'
  label_fr TEXT NOT NULL,
  label_en TEXT NOT NULL,
  value TEXT NOT NULL,
  suffix TEXT,
  mode TEXT DEFAULT 'auto' CHECK (mode IN ('auto', 'manual')),
  order_index INTEGER DEFAULT 0
);
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_stats' AND policyname = 'Allow public read site_stats') THEN
    CREATE POLICY "Allow public read site_stats" ON public.site_stats
      FOR SELECT TO public
      USING (true);
  END IF;
END $$;

-- 11. Journal d'Audit Admin
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 12. Données initiales officielles des Plans (selon la spécification maître)
INSERT INTO public.plans (id, name_fr, name_en, duration_days, price_xaf, included_coupon_types, is_popular, order_index)
VALUES 
  ('rookie', 'Fast Rookie', 'Fast Rookie', 14, 3999, ARRAY['SAFE', 'FUN'], false, 1),
  ('standard', 'Fast Standard', 'Fast Standard', 30, 5999, ARRAY['SAFE', 'FUN'], true, 2),
  ('premium', 'Fast Premium', 'Fast Premium', 30, 8999, ARRAY['SAFE', 'FUN', 'MONTANTE', 'PREMIUM'], false, 3)
ON CONFLICT (id) DO UPDATE SET 
  price_xaf = EXCLUDED.price_xaf,
  duration_days = EXCLUDED.duration_days,
  included_coupon_types = EXCLUDED.included_coupon_types;

-- 13. Données initiales des Types de Coupons
INSERT INTO public.coupon_types (code, label_fr, label_en, description_fr, description_en, included_in_plans, unlock_price_xaf, is_extra, order_index)
VALUES
  ('SAFE', 'SAFE', 'SAFE', 'Risque maîtrisé, cote entre 1.20 et 2.70', 'Low risk, odds 1.20 - 2.70', ARRAY['rookie', 'standard', 'premium'], 0, false, 1),
  ('FUN', 'FUN', 'FUN', 'Combiné à grosse cote', 'High odds accumulator', ARRAY['rookie', 'standard', 'premium'], 0, false, 2),
  ('MONTANTE', 'MONTANTE', 'MONTANTE', 'Série progressive de 3 à 5 paliers', 'Progressive series of 3 to 5 steps', ARRAY['premium'], 500, false, 3),
  ('PREMIUM', 'PREMIUM', 'PREMIUM', 'Contenu exclusif (scores exacts)', 'Exclusive premium content', ARRAY['premium'], 700, false, 4)
ON CONFLICT (code) DO UPDATE SET 
  unlock_price_xaf = EXCLUDED.unlock_price_xaf,
  included_in_plans = EXCLUDED.included_in_plans;

-- 14. Paramètres de configuration par défaut
INSERT INTO public.settings (key, value)
VALUES
  ('xaf_per_eur', '655.957'::jsonb),
  ('display_currency', '"EUR"'::jsonb),
  ('gift_coupon_type', '"SAFE"'::jsonb),
  ('publish_time', '"10:00"'::jsonb),
  ('auto_publish', 'false'::jsonb),
  ('ai_model', '"grok-beta"'::jsonb),
  ('pack_unlock_price_xaf', '1000'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 15. Inscription des administrateurs initiaux
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users WHERE email IN ('nyaulrich95@gmail.com', 'sangohondamosgaetangaetan@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

-- 16. Fonction RPC d'accès sécurisé aux coupons (Server-Side Entitlement Check)
CREATE OR REPLACE FUNCTION public.get_coupon_content(p_coupon_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_coupon RECORD;
  v_has_access BOOLEAN := false;
  v_is_admin BOOLEAN := false;
  v_active_plan_tier TEXT;
  v_selections JSONB := '[]'::jsonb;
  v_montante_steps JSONB := '[]'::jsonb;
  v_unlock_price INTEGER := 500;
BEGIN
  -- Récupérer le coupon
  SELECT * INTO v_coupon FROM public.coupons WHERE id = p_coupon_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Coupon introuvable');
  END IF;

  -- Vérifier le statut admin
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = v_user_id) INTO v_is_admin;
  END IF;

  -- Les brouillons sont visibles uniquement par les admins
  IF v_coupon.status = 'draft' AND NOT v_is_admin THEN
    RETURN jsonb_build_object('error', 'Coupon non disponible');
  END IF;

  -- Prix de déblocage unitaire
  SELECT COALESCE(unlock_price_xaf, 500) INTO v_unlock_price
  FROM public.coupon_types
  WHERE code = v_coupon.type;

  -- Vérifier si l'utilisateur possède un abonnement actif
  IF v_user_id IS NOT NULL AND NOT v_has_access THEN
    SELECT plan_tier INTO v_active_plan_tier
    FROM public.subscriptions
    WHERE user_id = v_user_id 
      AND status = 'active'
      AND expires_at > timezone('utc', now())
    ORDER BY expires_at DESC
    LIMIT 1;

    IF v_active_plan_tier IS NOT NULL THEN
      IF v_active_plan_tier = 'premium' OR v_active_plan_tier = 'Fast Premium' THEN
        v_has_access := true;
      ELSIF (v_active_plan_tier = 'rookie' OR v_active_plan_tier = 'standard' OR v_active_plan_tier = 'Fast Rookie' OR v_active_plan_tier = 'Fast Standard')
        AND (v_coupon.type = 'SAFE' OR v_coupon.type = 'FUN' OR v_coupon.category = 'SAFE' OR v_coupon.category = 'FUN') THEN
        v_has_access := true;
      END IF;
    END IF;
  END IF;

  -- Vérifier un déblocage à l'unité
  IF v_user_id IS NOT NULL AND NOT v_has_access THEN
    SELECT EXISTS(
      SELECT 1 FROM public.coupon_unlocks 
      WHERE user_id = v_user_id AND coupon_id = p_coupon_id
    ) INTO v_has_access;
  END IF;

  -- Admin a accès total
  IF v_is_admin THEN
    v_has_access := true;
  END IF;

  -- Coupon gratuit
  IF v_coupon.type = 'FREE' OR v_coupon.category = 'FREE' OR v_coupon.is_locked = false THEN
    v_has_access := true;
  END IF;

  -- SI NON AUTORISÉ : Renvoyer uniquement les métadonnées sans aucune sélection ni cote cachée
  IF NOT v_has_access THEN
    RETURN jsonb_build_object(
      'id', v_coupon.id,
      'date', v_coupon.date,
      'type', v_coupon.type,
      'category', v_coupon.category,
      'status', v_coupon.status,
      'is_locked', true,
      'confidence', v_coupon.confidence,
      'unlock_price_xaf', v_unlock_price
    );
  END IF;

  -- SI AUTORISÉ : Renvoyer le contenu complet
  SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.position ASC), '[]'::jsonb)
  INTO v_selections
  FROM public.coupon_selections s
  WHERE s.coupon_id = p_coupon_id;

  IF v_coupon.type = 'MONTANTE' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.step ASC), '[]'::jsonb)
    INTO v_montante_steps
    FROM public.coupon_montante_steps m
    WHERE m.coupon_id = p_coupon_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_coupon.id,
    'date', v_coupon.date,
    'title', v_coupon.title,
    'type', v_coupon.type,
    'category', v_coupon.category,
    'total_odds', v_coupon.total_odds,
    'confidence', v_coupon.confidence,
    'status', v_coupon.status,
    'is_locked', false,
    'analysis_fr', v_coupon.analysis_snippet,
    'selections', CASE WHEN jsonb_array_length(v_selections) > 0 THEN v_selections ELSE v_coupon.matches END,
    'montante_steps', v_montante_steps
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_coupon_content TO anon, authenticated;

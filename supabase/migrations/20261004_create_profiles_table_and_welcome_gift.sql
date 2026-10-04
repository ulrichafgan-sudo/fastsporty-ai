-- Migration: 20261004_create_profiles_table_and_welcome_gift.sql
-- Description: Create profiles table, RLS policies, auto-creation trigger on auth.users, and welcome gift claim RPC

-- 1. Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  public_id TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  language TEXT DEFAULT 'fr',
  welcome_gift_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 4. Unique Public ID Generator Function (e.g. FS-004821)
CREATE OR REPLACE FUNCTION public.generate_public_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  done BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    new_id := 'FS-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE public_id = new_id) THEN
      done := TRUE;
    END IF;
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger on auth.users creation to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, public_id, avatar_url, language, welcome_gift_claimed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    public.generate_public_id(),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'language', 'fr'),
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Server-side RPC for Welcome Gift Claim (Enforces claim once on server)
CREATE OR REPLACE FUNCTION public.claim_welcome_gift()
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: User not logged in');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Profile not found');
  END IF;

  IF v_profile.welcome_gift_claimed = TRUE THEN
    RETURN jsonb_build_object('success', false, 'message', 'Welcome gift already claimed');
  END IF;

  UPDATE public.profiles 
  SET welcome_gift_claimed = TRUE 
  WHERE id = auth.uid();

  RETURN jsonb_build_object('success', true, 'message', 'Welcome gift claimed successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

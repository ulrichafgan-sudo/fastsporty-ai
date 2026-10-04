-- Migration: 20261004_claim_welcome_gift.sql
-- Function to claim the welcome gift (unlocks today's SAFE coupon server-side)

CREATE OR REPLACE FUNCTION public.claim_welcome_gift()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_claimed BOOLEAN := false;
  v_gift_type TEXT := 'SAFE';
  v_coupon_id TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT COALESCE(welcome_gift_claimed, false) INTO v_claimed
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cadeau de bienvenue déjà réclamé');
  END IF;

  SELECT value INTO v_gift_type
  FROM public.settings
  WHERE key = 'gift_coupon_type';

  IF v_gift_type IS NULL THEN
    v_gift_type := 'SAFE';
  END IF;

  SELECT id INTO v_coupon_id
  FROM public.coupons
  WHERE type = v_gift_type
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_unlocks (user_id, coupon_id, method)
    VALUES (v_user_id, v_coupon_id, 'gift')
    ON CONFLICT (user_id, coupon_id) DO NOTHING;
  END IF;

  UPDATE public.profiles
  SET welcome_gift_claimed = true,
      welcome_gift_claimed_at = timezone('utc', now())
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'coupon_id', v_coupon_id,
    'gift_type', v_gift_type
  );
END;
$$;

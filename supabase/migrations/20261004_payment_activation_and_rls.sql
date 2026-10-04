-- Migration: 20261004_payment_activation_and_rls.sql
-- Add missing RLS policies on payments & coupon_unlocks, and atomic activation RPC

CREATE POLICY "Users can insert own payments"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own payments"
ON public.payments FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own coupon unlocks"
ON public.coupon_unlocks FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.process_payment_activation(
    p_kind TEXT,
    p_plan_key TEXT,
    p_coupon_id TEXT DEFAULT NULL,
    p_transaction_ref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_duration_days INTEGER := 30;
    v_price_xaf INTEGER := 5999;
    v_plan_name TEXT := 'Fast Standard';
    v_expires_at TIMESTAMPTZ;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
    END IF;

    IF p_kind = 'plan' THEN
        IF p_plan_key = 'rookie' THEN
            v_duration_days := 14;
            v_price_xaf := 3999;
            v_plan_name := 'Fast Rookie';
        ELSIF p_plan_key = 'standard' THEN
            v_duration_days := 30;
            v_price_xaf := 5999;
            v_plan_name := 'Fast Standard';
        ELSIF p_plan_key = 'premium' THEN
            v_duration_days := 30;
            v_price_xaf := 8999;
            v_plan_name := 'Fast Premium';
        END IF;

        v_expires_at := v_now + (v_duration_days || ' days')::INTERVAL;

        INSERT INTO public.subscriptions (
            user_id,
            plan_tier,
            plan_name,
            duration_days,
            amount_paid,
            currency,
            payment_method,
            provider,
            payment_reference,
            status,
            starts_at,
            expires_at
        ) VALUES (
            v_user_id,
            p_plan_key,
            v_plan_name,
            v_duration_days,
            v_price_xaf,
            'XAF',
            'maketou',
            'maketou',
            COALESCE(p_transaction_ref, 'TX-' || floor(random()*1000000)::text),
            'active',
            v_now,
            v_expires_at
        );

        UPDATE public.profiles
        SET subscription_tier = p_plan_key,
            subscription_name = v_plan_name,
            subscription_days_remaining = v_duration_days,
            subscription_expires_at = v_expires_at
        WHERE id = v_user_id;

    ELSIF p_kind = 'unlock' AND p_coupon_id IS NOT NULL THEN
        INSERT INTO public.coupon_unlocks (user_id, coupon_id, method)
        VALUES (v_user_id, p_coupon_id, 'paid')
        ON CONFLICT (user_id, coupon_id) DO NOTHING;

    ELSIF p_kind = 'pack' THEN
        INSERT INTO public.coupon_unlocks (user_id, coupon_id, method)
        SELECT v_user_id, c.id, 'paid'
        FROM public.coupons c
        WHERE c.type IN ('MONTANTE', 'PREMIUM')
        ON CONFLICT (user_id, coupon_id) DO NOTHING;
    END IF;

    INSERT INTO public.payments (
        user_id,
        kind,
        plan_id,
        coupon_id,
        amount_xaf,
        provider,
        provider_reference,
        status,
        paid_at
    ) VALUES (
        v_user_id,
        p_kind,
        p_plan_key,
        p_coupon_id,
        v_price_xaf,
        'maketou',
        COALESCE(p_transaction_ref, 'TX-' || floor(random()*1000000)::text),
        'paid',
        v_now
    )
    ON CONFLICT (provider_reference) DO UPDATE
    SET status = 'paid', paid_at = v_now;

    RETURN jsonb_build_object(
        'success', true,
        'kind', p_kind,
        'plan_key', p_plan_key,
        'expires_at', v_expires_at
    );
END;
$$;

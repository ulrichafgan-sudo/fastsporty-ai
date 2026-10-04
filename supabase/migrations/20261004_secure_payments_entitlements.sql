-- =====================================================================
-- FAST SPORTY AI — Sécurisation paiements MakeTou + droits par forfait
-- =====================================================================

-- ---------- 1. Secrets serveur (jamais lisibles par le navigateur) ----------
create table if not exists public.app_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

-- ---------- 2. Helpers ----------
create or replace function public.is_admin(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admin_users where user_id = p_uid);
$$;

-- Normalise les anciens codes de type
create or replace function public.norm_coupon_type(p_type text)
returns text language sql immutable as $$
  select case upper(coalesce(p_type,''))
    when 'FAN' then 'FUN'
    when 'SCORE EXACT' then 'PREMIUM'
    when 'EXACT' then 'PREMIUM'
    else upper(coalesce(p_type,'')) end;
$$;

-- Abonnement actif (le plus long) d'un utilisateur
create or replace function public.active_plan(p_uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select s.plan_tier from public.subscriptions s
  where s.user_id = p_uid and s.status = 'active' and s.expires_at > now()
  order by case s.plan_tier when 'premium' then 3 when 'standard' then 2 when 'rookie' then 1 else 0 end desc,
           s.expires_at desc
  limit 1;
$$;

-- Règle unique d'accès à un coupon (source de vérité)
create or replace function public.can_access_coupon(p_uid uuid, p_coupon_id text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  c record; v_plan text; v_type text;
begin
  select * into c from public.coupons where id = p_coupon_id;
  if not found then return false; end if;
  if c.is_locked = false or upper(coalesce(c.type,'')) in ('FREE','WON') or c.status = 'won' then return true; end if;
  if p_uid is null then return false; end if;
  if public.is_admin(p_uid) then return true; end if;
  if exists(select 1 from public.coupon_unlocks where user_id = p_uid and coupon_id = p_coupon_id) then return true; end if;
  v_plan := public.active_plan(p_uid);
  if v_plan is null then return false; end if;
  v_type := public.norm_coupon_type(c.type);
  return exists(select 1 from public.plans p where p.id = v_plan and v_type = any(p.included_coupon_types));
end; $$;

-- ---------- 3. Flux de coupons filtré côté serveur ----------
create or replace function public.get_coupons_feed()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_admin boolean := public.is_admin(auth.uid());
begin
  return coalesce((
    select jsonb_agg(
      case when public.can_access_coupon(v_uid, c.id) then
        to_jsonb(c) || jsonb_build_object('has_access', true)
      else
        jsonb_build_object(
          'id', c.id, 'ticket_ref', c.ticket_ref, 'title', c.title, 'type', c.type,
          'category', c.category, 'is_locked', true, 'confidence', c.confidence,
          'date', c.date, 'league', c.league, 'status', c.status, 'created_at', c.created_at,
          'match_count', coalesce(jsonb_array_length(c.matches), 0),
          'unlock_price_xaf', (select unlock_price_xaf from public.coupon_types t where t.code = public.norm_coupon_type(c.type)),
          'has_access', false)
      end order by c.created_at desc)
    from public.coupons c
    where c.status is distinct from 'draft' or v_admin
  ), '[]'::jsonb);
end; $$;
grant execute on function public.get_coupons_feed() to anon, authenticated;

-- Statut d'accès de l'utilisateur courant
create or replace function public.get_my_access()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); s record;
begin
  if v_uid is null then return jsonb_build_object('logged_in', false); end if;
  select * into s from public.subscriptions
   where user_id = v_uid and status = 'active' and expires_at > now()
   order by case plan_tier when 'premium' then 3 when 'standard' then 2 when 'rookie' then 1 else 0 end desc, expires_at desc
   limit 1;
  return jsonb_build_object(
    'logged_in', true,
    'is_admin', public.is_admin(v_uid),
    'plan', s.plan_tier,
    'plan_name', s.plan_name,
    'expires_at', s.expires_at,
    'days_left', case when s.expires_at is null then 0 else greatest(0, ceil(extract(epoch from (s.expires_at - now()))/86400))::int end,
    'included_types', coalesce((select to_jsonb(included_coupon_types) from public.plans where id = s.plan_tier), '[]'::jsonb),
    'rookie_bonus_available', (s.plan_tier = 'rookie' and not coalesce((select special_coupon_unlocked from public.profiles where id = v_uid), false))
  );
end; $$;
grant execute on function public.get_my_access() to authenticated;

-- ---------- 4. Activation idempotente d'un paiement (service_role uniquement) ----------
create or replace function public.apply_paid_payment(p_payment_id uuid, p_cart_id text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p record; pl record; v_start timestamptz; v_exp timestamptz; v_sub uuid; v_today_ids text[];
begin
  select * into p from public.payments where id = p_payment_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'payment_not_found'); end if;
  if p.status = 'paid' then return jsonb_build_object('success', true, 'already_processed', true); end if;

  if p.kind = 'plan' then
    select * into pl from public.plans where id = p.plan_id;
    if not found then return jsonb_build_object('success', false, 'error', 'plan_not_found'); end if;
    -- Empilement : on prolonge à partir de la fin de l'abonnement actif du même forfait
    select greatest(now(), coalesce(max(expires_at), now())) into v_start
      from public.subscriptions where user_id = p.user_id and plan_tier = pl.id and status = 'active' and expires_at > now();
    v_exp := v_start + make_interval(days => pl.duration_days);
    insert into public.subscriptions(user_id, plan_tier, plan_name, duration_days, amount_paid, currency,
                                     payment_method, provider, payment_reference, status, starts_at, expires_at)
    values (p.user_id, pl.id, pl.name_fr, pl.duration_days, p.amount_xaf, 'XAF', 'maketou', 'maketou',
            coalesce(p_cart_id, p.provider_reference), 'active', now(), v_exp)
    returning id into v_sub;
    update public.profiles set
      subscription_tier = pl.id, subscription_name = pl.name_fr,
      subscription_expires_at = v_exp,
      subscription_days_remaining = ceil(extract(epoch from (v_exp - now()))/86400)::int,
      daily_unlocked_types = pl.included_coupon_types,
      special_coupon_unlocked = case when pl.id = 'rookie' then false else special_coupon_unlocked end
    where id = p.user_id;

  elsif p.kind = 'unlock' then
    insert into public.coupon_unlocks(user_id, coupon_id, method, payment_id)
    values (p.user_id, p.coupon_id, 'paid', p.id) on conflict (user_id, coupon_id) do nothing;

  elsif p.kind = 'pack' then
    select array_agg(id) into v_today_ids from public.coupons
     where public.norm_coupon_type(type) in ('MONTANTE','PREMIUM')
       and is_locked and created_at >= date_trunc('day', now()) - interval '1 day'
       and status is distinct from 'won';
    insert into public.coupon_unlocks(user_id, coupon_id, method, payment_id)
    select p.user_id, unnest(coalesce(v_today_ids, '{}')), 'paid', p.id
    on conflict (user_id, coupon_id) do nothing;
  end if;

  update public.payments set status = 'paid', paid_at = now(),
         provider_reference = coalesce(p_cart_id, provider_reference)
   where id = p.id;
  return jsonb_build_object('success', true, 'kind', p.kind);
end; $$;
revoke all on function public.apply_paid_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.apply_paid_payment(uuid, text) to service_role;

-- ---------- 5. Bonus Rookie (1 déblocage Montante/Premium inclus) ----------
create or replace function public.use_rookie_bonus(p_coupon_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_type text;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'error', 'Non authentifié'); end if;
  if public.active_plan(v_uid) is distinct from 'rookie' then
    return jsonb_build_object('success', false, 'error', 'Réservé au forfait Fast Rookie actif'); end if;
  if coalesce((select special_coupon_unlocked from public.profiles where id = v_uid), false) then
    return jsonb_build_object('success', false, 'error', 'Bonus déjà utilisé'); end if;
  select public.norm_coupon_type(type) into v_type from public.coupons where id = p_coupon_id;
  if v_type not in ('MONTANTE','PREMIUM') then
    return jsonb_build_object('success', false, 'error', 'Coupon non éligible'); end if;
  insert into public.coupon_unlocks(user_id, coupon_id, method) values (v_uid, p_coupon_id, 'rookie_bonus')
  on conflict (user_id, coupon_id) do nothing;
  update public.profiles set special_coupon_unlocked = true where id = v_uid;
  return jsonb_build_object('success', true);
end; $$;
grant execute on function public.use_rookie_bonus(text) to authenticated;

-- ---------- 6. Cadeau de bienvenue (corrigé : colonne inexistante) ----------
create or replace function public.claim_welcome_gift()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_coupon text;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'error', 'Non authentifié'); end if;
  if coalesce((select welcome_gift_claimed from public.profiles where id = v_uid), false) then
    return jsonb_build_object('success', false, 'error', 'Cadeau de bienvenue déjà réclamé'); end if;
  select id into v_coupon from public.coupons
   where public.norm_coupon_type(type) = 'SAFE' and status is distinct from 'won'
   order by created_at desc limit 1;
  if v_coupon is not null then
    insert into public.coupon_unlocks(user_id, coupon_id, method) values (v_uid, v_coupon, 'gift')
    on conflict (user_id, coupon_id) do nothing;
  end if;
  update public.profiles set welcome_gift_claimed = true where id = v_uid;
  return jsonb_build_object('success', true, 'coupon_id', v_coupon, 'gift_type', 'SAFE');
end; $$;

-- ---------- 7. Configuration MakeTou par l'admin ----------
create or replace function public.admin_set_maketou_config(p_api_key text, p_product_id text, p_base_url text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  if coalesce(p_api_key,'') <> '' then
    insert into public.app_secrets(key,value) values ('MAKETOU_API_KEY', trim(p_api_key))
    on conflict (key) do update set value = excluded.value, updated_at = now(); end if;
  if coalesce(p_product_id,'') <> '' then
    insert into public.app_secrets(key,value) values ('MAKETOU_PRODUCT_DOCUMENT_ID', trim(p_product_id))
    on conflict (key) do update set value = excluded.value, updated_at = now(); end if;
  insert into public.app_secrets(key,value) values ('APP_BASE_URL', coalesce(rtrim(trim(p_base_url),'/'),''))
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return public.admin_get_maketou_status();
end; $$;

create or replace function public.admin_get_maketou_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'has_api_key', exists(select 1 from public.app_secrets where key='MAKETOU_API_KEY' and value <> ''),
    'api_key_hint', (select '••••' || right(value, 4) from public.app_secrets where key='MAKETOU_API_KEY'),
    'product_id', (select value from public.app_secrets where key='MAKETOU_PRODUCT_DOCUMENT_ID'),
    'base_url', (select value from public.app_secrets where key='APP_BASE_URL'));
end; $$;
grant execute on function public.admin_set_maketou_config(text,text,text) to authenticated;
grant execute on function public.admin_get_maketou_status() to authenticated;

-- ---------- 8. Fermeture des failles ----------
-- Fonctions dangereuses accessibles publiquement
revoke all on function public.process_payment_activation(text,text,text,text) from public, anon, authenticated;
revoke all on function public.activate_user_subscription(uuid,text,text,integer,numeric,text,text,text,text) from public, anon, authenticated;
revoke all on function public.reset_user_password(text,text) from public, anon, authenticated;

-- Paiements : lecture seule pour le propriétaire, écriture serveur uniquement
drop policy if exists "Users can insert own payments" on public.payments;
drop policy if exists "Users can update own payments" on public.payments;
-- Déblocages : écriture serveur uniquement
drop policy if exists "Users can insert own coupon unlocks" on public.coupon_unlocks;
-- Abonnements : chacun ne voit que les siens, aucune écriture client
drop policy if exists "Allow public read subscriptions" on public.subscriptions;
drop policy if exists "Allow insert subscriptions" on public.subscriptions;
drop policy if exists "Allow update subscriptions" on public.subscriptions;
create policy "Users read own subscriptions" on public.subscriptions for select using (auth.uid() = user_id or public.is_admin());

-- Coupons : contenu complet réservé aux admins (le public passe par get_coupons_feed)
drop policy if exists "Allow public read access to coupons" on public.coupons;
drop policy if exists "Allow insert coupons" on public.coupons;
drop policy if exists "Allow update coupons" on public.coupons;
drop policy if exists "Allow delete coupons" on public.coupons;
create policy "Admins manage coupons" on public.coupons for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Allow public read selections" on public.coupon_selections;
create policy "Admins read selections" on public.coupon_selections for select using (public.is_admin());

-- Admin : peut lire paiements / déblocages de tous
create policy "Admins read payments" on public.payments for select using (public.is_admin());
create policy "Admins read unlocks" on public.coupon_unlocks for select using (public.is_admin());

-- Profils : un utilisateur ne peut pas s'auto-attribuer un forfait ou un rôle
create or replace function public.protect_profile_fields()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated','anon') then
    new.role := old.role;
    new.subscription_tier := old.subscription_tier;
    new.subscription_name := old.subscription_name;
    new.subscription_days_remaining := old.subscription_days_remaining;
    new.subscription_expires_at := old.subscription_expires_at;
    new.special_coupon_unlocked := old.special_coupon_unlocked;
    new.daily_unlocked_types := old.daily_unlocked_types;
    new.welcome_gift_claimed := old.welcome_gift_claimed;
    new.email := old.email;
    new.public_id := old.public_id;
  end if;
  return new;
end; $$;
drop trigger if exists trg_protect_profile_fields on public.profiles;
create trigger trg_protect_profile_fields before update on public.profiles
for each row execute function public.protect_profile_fields();

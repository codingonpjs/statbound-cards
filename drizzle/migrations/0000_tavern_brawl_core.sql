-- ===== roles =====
create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ===== profiles =====
create table public.profiles (
  user_id uuid primary key,
  name text not null,
  level int not null default 1,
  xp int not null default 0,
  cash int not null default 500,
  strength int not null default 10,
  defense int not null default 10,
  speed int not null default 10,
  dexterity int not null default 10,
  energy int not null default 100,
  nerve int not null default 25,
  life int not null default 30,
  energy_updated_at timestamptz not null default now(),
  nerve_updated_at timestamptz not null default now(),
  life_updated_at timestamptz not null default now(),
  hospital_until timestamptz,
  wins int not null default 0,
  losses int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by authed" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (user_id = auth.uid());

-- ===== cards =====
create table public.cards (
  id text primary key,
  name text not null,
  type text not null check (type in ('minion','spell','weapon')),
  cost int not null,
  attack int not null default 0,
  health int not null default 0,
  durability int not null default 0,
  keywords text[] not null default '{}',
  effect jsonb,
  rarity text not null default 'common',
  price int not null,
  requirements jsonb not null default '{}',
  flavor text,
  art_url text,
  default_art_url text
);
grant select on public.cards to authenticated, anon;
grant all on public.cards to service_role;
alter table public.cards enable row level security;
create policy "cards public read" on public.cards for select using (true);
create policy "admins manage cards" on public.cards for update to authenticated using (public.has_role(auth.uid(),'admin'));

-- ===== player cards =====
create table public.player_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  card_id text not null references public.cards(id) on delete cascade,
  quantity int not null default 1,
  custom_art_url text,
  unique (user_id, card_id)
);
grant select, insert, update, delete on public.player_cards to authenticated;
grant all on public.player_cards to service_role;
alter table public.player_cards enable row level security;
create policy "own cards" on public.player_cards for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===== decks =====
create table public.decks (
  user_id uuid primary key,
  card_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.decks to authenticated;
grant all on public.decks to service_role;
alter table public.decks enable row level security;
create policy "decks readable by authed" on public.decks for select to authenticated using (true);
create policy "own deck write" on public.decks for insert to authenticated with check (user_id = auth.uid());
create policy "own deck update" on public.decks for update to authenticated using (user_id = auth.uid());

-- ===== npcs =====
create table public.npcs (
  id text primary key,
  name text not null,
  tier int not null,
  strength int not null,
  defense int not null,
  speed int not null,
  dexterity int not null,
  reward_cash int not null,
  reward_xp int not null,
  hospital_minutes int not null,
  deck text[] not null,
  blurb text
);
grant select on public.npcs to authenticated;
grant all on public.npcs to service_role;
alter table public.npcs enable row level security;
create policy "npcs read" on public.npcs for select to authenticated using (true);

-- ===== crimes =====
create table public.crimes (
  id text primary key,
  name text not null,
  description text not null,
  nerve_cost int not null,
  base_success numeric not null,
  stat text not null,
  stat_divisor int not null,
  cash_min int not null,
  cash_max int not null,
  xp int not null,
  fail_hospital_minutes int not null default 0
);
grant select on public.crimes to authenticated;
grant all on public.crimes to service_role;
alter table public.crimes enable row level security;
create policy "crimes read" on public.crimes for select to authenticated using (true);

create table public.crime_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  crime_id text not null,
  success boolean not null,
  cash int not null default 0,
  xp int not null default 0,
  message text,
  created_at timestamptz not null default now()
);
grant select, insert on public.crime_log to authenticated;
grant all on public.crime_log to service_role;
alter table public.crime_log enable row level security;
create policy "own crime log" on public.crime_log for select to authenticated using (user_id = auth.uid());

-- ===== battles =====
create table public.battles (
  id uuid primary key default gen_random_uuid(),
  attacker_id uuid not null,
  defender_id uuid,
  npc_id text,
  state jsonb not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.battles to authenticated;
grant all on public.battles to service_role;
alter table public.battles enable row level security;
create policy "own battles" on public.battles for select to authenticated using (attacker_id = auth.uid() or defender_id = auth.uid());
create policy "own battles insert" on public.battles for insert to authenticated with check (attacker_id = auth.uid());
create policy "own battles update" on public.battles for update to authenticated using (attacker_id = auth.uid());

create index on public.battles (attacker_id, status);

-- ═══════════════════════════════════════════════════
--  HANDBALL PRO v7 — Supabase Schema
--  Pegá todo esto en SQL Editor → Run
-- ═══════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── TEAMS ─────────────────────────────────────────
create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null default '#3b82f6',
  created_at  timestamptz default now()
);

-- ── PLAYERS ───────────────────────────────────────
create table if not exists players (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid references teams(id) on delete cascade,
  name        text not null,
  number      int  not null,
  position    text not null default 'Campo',
  created_at  timestamptz default now()
);

-- ── MATCHES ───────────────────────────────────────
create table if not exists matches (
  id          uuid primary key default gen_random_uuid(),
  home_name   text not null,
  away_name   text not null,
  home_color  text default '#ef4444',
  away_color  text default '#3b82f6',
  home_score  int  default 0,
  away_score  int  default 0,
  match_date  text,
  status      text default 'live',
  created_at  timestamptz default now()
);

-- ── EVENTS ────────────────────────────────────────
create table if not exists events (
  id                uuid primary key default gen_random_uuid(),
  match_id          uuid references matches(id) on delete cascade,
  minute            int  not null default 1,
  team              text,
  type              text not null,
  zone              text,
  quadrant          int,
  attack_side       text,
  shooter_name      text,
  shooter_number    int,
  goalkeeper_name   text,
  goalkeeper_number int,
  sanctioned_name   text,
  sanctioned_number int,
  h_score           int  default 0,
  a_score           int  default 0,
  completed         boolean default false,
  quick_mode        boolean default false,
  created_at        timestamptz default now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────
alter table teams   enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table events  enable row level security;

create policy "public_teams"   on teams   for all using (true) with check (true);
create policy "public_players" on players for all using (true) with check (true);
create policy "public_matches" on matches for all using (true) with check (true);
create policy "public_events"  on events  for all using (true) with check (true);

-- ── DATOS INICIALES ───────────────────────────────
do $$
declare
  gei_id uuid;
  ber_id uuid;
begin
  insert into teams (name, color) values ('GEI', '#ef4444') returning id into gei_id;
  insert into players (team_id, name, number, position) values
    (gei_id, 'García',    1,  'Arquero'),
    (gei_id, 'López',     5,  'Armador'),
    (gei_id, 'Martínez',  7,  'Extremo Izq.'),
    (gei_id, 'Pérez',     9,  'Pivote'),
    (gei_id, 'Rodríguez', 11, 'Lateral Izq.'),
    (gei_id, 'Torres',    13, 'Extremo Der.'),
    (gei_id, 'Morales',   5,  'Armador'),
    (gei_id, 'Ríos',      4,  'Lateral Der.'),
    (gei_id, 'Vera',      9,  'Pivote'),
    (gei_id, 'Ruiz',      6,  'Lateral Izq.');

  insert into teams (name, color) values ('Bernal', '#3b82f6') returning id into ber_id;
  insert into players (team_id, name, number, position) values
    (ber_id, 'Sosa',    2,  'Arquero'),
    (ber_id, 'Ibáñez',  7,  'Extremo Izq.'),
    (ber_id, 'Herrera', 3,  'Lateral Der.'),
    (ber_id, 'Meza',    11, 'Pivote'),
    (ber_id, 'Castro',  8,  'Armador'),
    (ber_id, 'Acosta',  10, 'Lateral Izq.'),
    (ber_id, 'Vega',    14, 'Extremo Der.');
end $$;

-- ── MIGRACIÓN: campos de análisis avanzado ────────
-- Correr esto si ya tenés la tabla events creada:
alter table events add column if not exists distance    text;
alter table events add column if not exists situation   text default 'igualdad';
alter table events add column if not exists throw_type  text;

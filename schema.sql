-- =====================================================================
--  Content Vault — database schema
--  Run this in the Supabase SQL editor (Project → SQL → New query).
--  Safe to re-run: every statement is idempotent.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- table ----------
create table if not exists public.vault_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,

  type        text not null check (type in ('idea','context','reference','profile')),
  title       text,
  link        text,
  account     text,
  business    text,
  context     text,
  tags        text[]      not null default '{}',
  format      text        check (format in ('reel','static','carousel')),  -- reference only
  images      text[]      not null default '{}',                            -- URLs (Supabase Storage) or base64 from legacy import
  sources     jsonb       not null default '[]'::jsonb,                     -- [{label,url}] — context items can have many
  useful      boolean,    -- true / false / null (unrated)

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists vault_items_user_id_idx     on public.vault_items (user_id);
create index if not exists vault_items_user_type_idx   on public.vault_items (user_id, type);
create index if not exists vault_items_created_at_idx  on public.vault_items (user_id, created_at desc);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists vault_items_set_updated_at on public.vault_items;
create trigger vault_items_set_updated_at
  before update on public.vault_items
  for each row execute function public.set_updated_at();

-- ---------- row level security ----------
alter table public.vault_items enable row level security;

drop policy if exists "vault_items_select_own" on public.vault_items;
create policy "vault_items_select_own"
  on public.vault_items for select
  using (auth.uid() = user_id);

drop policy if exists "vault_items_insert_own" on public.vault_items;
create policy "vault_items_insert_own"
  on public.vault_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "vault_items_update_own" on public.vault_items;
create policy "vault_items_update_own"
  on public.vault_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "vault_items_delete_own" on public.vault_items;
create policy "vault_items_delete_own"
  on public.vault_items for delete
  using (auth.uid() = user_id);

-- ---------- screenshots bucket ----------
-- Create a Storage bucket named "vault-images" and lock it to the owner.
insert into storage.buckets (id, name, public)
  values ('vault-images', 'vault-images', true)
  on conflict (id) do nothing;

-- Public read so <img src> works; writes restricted to the owner.
drop policy if exists "vault_images_public_read" on storage.objects;
create policy "vault_images_public_read"
  on storage.objects for select
  using (bucket_id = 'vault-images');

drop policy if exists "vault_images_owner_insert" on storage.objects;
create policy "vault_images_owner_insert"
  on storage.objects for insert
  with check (bucket_id = 'vault-images' and auth.uid() = owner);

drop policy if exists "vault_images_owner_update" on storage.objects;
create policy "vault_images_owner_update"
  on storage.objects for update
  using (bucket_id = 'vault-images' and auth.uid() = owner);

drop policy if exists "vault_images_owner_delete" on storage.objects;
create policy "vault_images_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'vault-images' and auth.uid() = owner);

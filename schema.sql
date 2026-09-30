create table if not exists public.movimientos (
  id bigint generated always as identity primary key,
  descripcion text not null,
  monto numeric(12, 2) not null check (monto > 0),
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  categoria text not null,
  fecha date not null,
  creado_por uuid not null default auth.uid() references auth.users (id),
  creado_en timestamptz not null default now()
);

create table if not exists public.familia (
  email text primary key
);

insert into public.familia (email) values
  ('casaloolbeh@gmail.com')
on conflict (email) do nothing;

alter table public.movimientos enable row level security;
alter table public.familia enable row level security;

drop policy if exists "la familia puede ver" on public.movimientos;
create policy "la familia puede ver" on public.movimientos
  for select to authenticated using (true);

drop policy if exists "la familia puede agregar" on public.movimientos;
create policy "la familia puede agregar" on public.movimientos
  for insert to authenticated with check (true);

drop policy if exists "la familia puede borrar" on public.movimientos;
create policy "la familia puede borrar" on public.movimientos
  for delete to authenticated using (true);

grant select, insert, delete on public.movimientos to authenticated;

create or replace function public.solo_familia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.familia
    where lower(email) = lower(new.email)
  ) then
    raise exception 'Ese correo no pertenece a la familia';
  end if;
  return new;
end;
$$;

drop trigger if exists verificar_solo_familia on auth.users;
create trigger verificar_solo_familia
  before insert on auth.users
  for each row
  execute function public.solo_familia();

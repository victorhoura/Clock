-- Módulo Financeiro: lançamentos (receitas e despesas) e custos fixos recorrentes.
-- Rode este arquivo uma vez no Supabase (SQL Editor → New query → Run).

create table if not exists public.finance_recurring (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  category text not null default 'Outros',
  amount numeric(14, 2) not null check (amount >= 0),
  due_day smallint not null check (due_day between 1 and 31),
  active boolean not null default true,
  -- Primeiro mês (dia 1) em que a conta passa a ser gerada.
  start_period date not null default date_trunc('month', now())::date,
  -- Último mês já gerado, para que uma conta excluída à mão não volte a aparecer.
  last_generated_period date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('income', 'expense')),
  description text not null,
  category text not null default 'Outros',
  amount numeric(14, 2) not null check (amount >= 0),
  -- Data de competência: o mês em que entra no faturamento / custo.
  date date not null,
  due_date date,
  status text not null default 'paid' check (status in ('paid', 'pending')),
  paid_at date,
  cost_type text check (cost_type in ('fixed', 'variable')),
  recurring_id uuid references public.finance_recurring (id) on delete set null,
  -- Mês (dia 1) de uma conta gerada a partir de um custo fixo.
  period date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (recurring_id, period)
);

create index if not exists finance_transactions_date_idx on public.finance_transactions (date);
create index if not exists finance_transactions_status_due_idx on public.finance_transactions (status, due_date);

-- Mesmo modelo de acesso das demais tabelas do app (sem login, chave anon).
alter table public.finance_recurring enable row level security;
alter table public.finance_transactions enable row level security;

drop policy if exists "finance_recurring_all" on public.finance_recurring;
create policy "finance_recurring_all" on public.finance_recurring
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "finance_transactions_all" on public.finance_transactions;
create policy "finance_transactions_all" on public.finance_transactions
  for all to anon, authenticated using (true) with check (true);

-- Gera as contas do mês para cada custo fixo ativo, de onde parou até p_until.
-- Idempotente: a restrição unique (recurring_id, period) impede duplicatas mesmo
-- quando dois aparelhos abrem o app ao mesmo tempo.
create or replace function public.finance_generate_recurring(p_until date)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  r record;
  p date;
  last_day int;
  due date;
  -- Nunca gera mais que um mês à frente do relógio do servidor.
  cap date := (date_trunc('month', now()) + interval '1 month')::date;
  until_period date := least(date_trunc('month', p_until)::date, cap);
begin
  for r in select * from public.finance_recurring where active loop
    p := greatest(coalesce((r.last_generated_period + interval '1 month')::date, r.start_period), r.start_period);
    while p <= until_period loop
      last_day := extract(day from (p + interval '1 month' - interval '1 day'))::int;
      due := make_date(extract(year from p)::int, extract(month from p)::int, least(r.due_day::int, last_day));
      insert into public.finance_transactions
        (kind, description, category, amount, date, due_date, status, cost_type, recurring_id, period)
      values
        ('expense', r.description, r.category, r.amount, due, due, 'pending', 'fixed', r.id, p)
      on conflict (recurring_id, period) do nothing;
      p := (p + interval '1 month')::date;
    end loop;
    update public.finance_recurring
      set last_generated_period = until_period
      where id = r.id and (last_generated_period is null or last_generated_period < until_period);
  end loop;
end;
$$;

grant execute on function public.finance_generate_recurring(date) to anon, authenticated;

-- Sincronização em tempo real entre aparelhos.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'finance_recurring') then
    alter publication supabase_realtime add table public.finance_recurring;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'finance_transactions') then
    alter publication supabase_realtime add table public.finance_transactions;
  end if;
end $$;

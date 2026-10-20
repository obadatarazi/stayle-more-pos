-- stayle more · run this once in Supabase → SQL Editor → New query → Run

create table if not exists products (
  sku text primary key,
  name text not null default '',
  name_ar text not null,
  category text not null default 'أخرى',
  cost numeric not null default 0,
  price numeric not null default 0,
  cost_usd numeric not null default 0,
  usd_rate numeric not null default 0,
  initial_stock integer not null default 0,
  reorder_level integer not null default 5,
  quick_sale boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists sales (
  id bigint primary key,
  date date not null,
  sku text not null references products (sku) on delete cascade,
  quantity integer not null check (quantity > 0),
  unit_price numeric,
  unit_cost numeric,
  unit_cost_usd numeric,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id bigint primary key,
  category text not null,
  category_ar text not null,
  amount numeric not null check (amount > 0),
  due_date date not null,
  note text,
  created_at timestamptz not null default now()
);

alter table products enable row level security;
alter table sales enable row level security;
alter table expenses enable row level security;

drop policy if exists "products_all" on products;
drop policy if exists "sales_all" on sales;
drop policy if exists "expenses_all" on expenses;

create policy "products_all" on products for all using (true) with check (true);
create policy "sales_all" on sales for all using (true) with check (true);
create policy "expenses_all" on expenses for all using (true) with check (true);

alter publication supabase_realtime add table products;
alter publication supabase_realtime add table sales;
alter publication supabase_realtime add table expenses;

create table if not exists settings (
  name text primary key,
  value text not null
);

create table if not exists exchanges (
  id bigint primary key,
  date date not null,
  direction text not null check (direction in ('sypToUsd', 'usdToSyp')),
  syp_amount numeric not null check (syp_amount > 0),
  usd_amount numeric not null check (usd_amount > 0),
  note text,
  done_by text,
  done_by_name text,
  created_at timestamptz not null default now()
);

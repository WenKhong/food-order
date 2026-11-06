-- MENU
create table menu_items (
  id text primary key,                         -- readable slug, e.g. 'beef-pepperoni'
  name text not null,
  description text,
  category text not null check (category in ('pizza','pasta','sides','drinks','desserts')),
  price_cents integer not null check (price_cents > 0),
  spicy_level smallint not null default 0 check (spicy_level between 0 and 3),
  is_halal boolean not null default true,
  allergens text[] not null default '{}',
  tags text[] not null default '{}',
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

-- ORDERS
create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  fulfilment text not null check (fulfilment in ('pickup','delivery')),
  address text,
  status text not null default 'pending'
    check (status in ('pending','preparing','ready','completed','cancelled')),
  total_cents integer not null default 0 check (total_cents >= 0),
  created_at timestamptz not null default now(),
  constraint delivery_needs_address check (fulfilment = 'pickup' or address is not null)
);

create table order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id text not null references menu_items(id),
  qty integer not null check (qty between 1 and 20),
  unit_price_cents integer not null check (unit_price_cents > 0),
  notes text
);

create index order_items_order_id_idx on order_items(order_id);
create index orders_created_at_idx on orders(created_at desc);

-- PLACE ORDER: one transaction, prices taken from the DB, never from the client
create or replace function place_order(
  p_customer_name text,
  p_phone text,
  p_fulfilment text,
  p_address text,
  p_items jsonb   -- [{"menu_item_id":"margherita","qty":2,"notes":"extra basil"}]
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total integer := 0;
  v_item jsonb;
  v_price integer;
  v_available boolean;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order has no items';
  end if;

  insert into orders (customer_name, phone, fulfilment, address)
  values (p_customer_name, p_phone, p_fulfilment, p_address)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select price_cents, is_available into v_price, v_available
    from menu_items where id = v_item->>'menu_item_id';

    if v_price is null then
      raise exception 'Unknown item: %', v_item->>'menu_item_id';
    end if;
    if not v_available then
      raise exception 'Item unavailable: %', v_item->>'menu_item_id';
    end if;

    insert into order_items (order_id, menu_item_id, qty, unit_price_cents, notes)
    values (v_order_id, v_item->>'menu_item_id', (v_item->>'qty')::int, v_price, v_item->>'notes');

    v_total := v_total + v_price * (v_item->>'qty')::int;
  end loop;

  update orders set total_cents = v_total where id = v_order_id;
  return v_order_id;
end;
$$;

-- ACCESS: RLS on, only the server role gets in
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke execute on function place_order from public, anon, authenticated;
grant execute on function place_order to service_role;
-- ============================================
-- Phase 39: Retur Penjualan + Credit Note
-- Fitur #1 dari strategi enhancement E1
-- ============================================
begin;

-- 1. Tabel retur penjualan
create table if not exists sale_returns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  sale_id uuid not null references sales(id),
  return_date date not null default current_date,
  refund_amount numeric(15,2) not null default 0,
  reason text,
  status text not null default 'posted' check (status in ('posted','void')),
  journal_entry_id uuid references journal_entries(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Item retur
create table if not exists sale_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references sale_returns(id) on delete cascade,
  sale_item_id uuid not null references sale_items(id),
  product_id uuid not null references products(id),
  qty integer not null check(qty > 0),
  unit_price numeric(15,2) not null,
  unit_cost numeric(15,2) not null,
  subtotal numeric(15,2) generated always as (qty * unit_price) stored,
  cost_subtotal numeric(15,2) generated always as (qty * unit_cost) stored,
  tenant_id uuid not null default tx_tenant() references tenants(id),
  created_at timestamptz default now()
);

create index idx_sale_returns_sale on sale_returns(sale_id);
create index idx_sale_returns_tenant on sale_returns(tenant_id);
create index idx_sale_return_items_return on sale_return_items(return_id);

-- 3. Fungsi create_return — pola single-entry-cascade
create or replace function create_return(
  p_tenant_id uuid,
  p_sale_id uuid,
  p_reason text,
  p_items jsonb  -- [{ sale_item_id: uuid, qty: int }]
) returns uuid language plpgsql as $$
declare
  v_return_id uuid := gen_random_uuid();
  v_entry_id uuid := gen_random_uuid();
  v_sale record;
  v_item jsonb;
  v_si record;
  v_qty integer;
  v_refund numeric := 0;
  v_cost_rev numeric := 0;
  v_product_id uuid;
  v_channel_code text;
begin
  perform set_config('app.tenant', p_tenant_id::text, true);

  -- Validasi sale
  select s.*, ch.code as ch_code into v_sale
  from sales s join channels ch on ch.id = s.channel_id
  where s.id = p_sale_id and s.tenant_id = tx_tenant();
  if v_sale.id is null then raise exception 'Penjualan tidak ditemukan'; end if;

  -- Proses tiap item
  for v_item in select * from jsonb_array_elements(p_items) loop
    select si.* into v_si
    from sale_items si
    where si.id = (v_item->>'sale_item_id')::uuid
      and si.sale_id = p_sale_id;
    if v_si.id is null then raise exception 'Item penjualan tidak ditemukan: %', (v_item->>'sale_item_id'); end if;

    v_qty := (v_item->>'qty')::integer;
    if v_qty <= 0 then raise exception 'Qty retur harus > 0'; end if;

    -- Hitung maksimum yang bisa diretur (belum diretur sebelumnya)
    -- (cek existing returns)
    if v_qty > v_si.qty - coalesce((
      select sum(ri.qty) from sale_return_items ri
      join sale_returns r on r.id = ri.return_id
      where ri.sale_item_id = v_si.id and r.status = 'posted' and r.tenant_id = tx_tenant()
    ), 0) then
      raise exception 'Qty retur melebihi qty yang sudah terjual (item: %)', v_si.name;
    end if;

    v_product_id := v_si.product_id;
    v_refund := v_refund + (v_si.unit_price * v_qty);
    v_cost_rev := v_cost_rev + (v_si.unit_cost * v_qty);

    -- Restock: tambah stok
    update products set stock = stock + v_qty, updated_at = now() where id = v_product_id and tenant_id = tx_tenant();

    -- Tambah inventory_layers baru dengan historical cost (restock at cost)
    insert into inventory_layers(product_id, qty_added, qty_remaining, unit_cost, tenant_id)
    values (v_product_id, v_qty, v_qty, v_si.unit_cost, tx_tenant());

    -- Catat gerak stok
    insert into stock_movements(product_id, type, qty, ref_type, ref_id, note)
    values (v_product_id, 'IN', v_qty, 'RETURN', v_return_id,
            'Retur dari ' || v_sale.invoice_no || ' · ' || v_si.name);

    -- Insert item retur
    insert into sale_return_items(return_id, sale_item_id, product_id, qty, unit_price, unit_cost, tenant_id)
    values (v_return_id, v_si.id, v_product_id, v_qty, v_si.unit_price, v_si.unit_cost, tx_tenant());
  end loop;

  -- Insert header retur
  insert into sale_returns(id, tenant_id, sale_id, refund_amount, reason, status, journal_entry_id)
  values (v_return_id, tx_tenant(), p_sale_id, v_refund, p_reason, 'posted', v_entry_id);

  -- Jurnal retur penjualan
  -- Dr Retur Penjualan = refund amount (mengurangi pendapatan)
  -- Cr Kas/Bank = refund amount (dikembalikan tunai, sesuai channel sale)
  -- Dr Persediaan = cost reversal (stok masuk lagi)
  -- Cr HPP = cost reversal (mengurangi HPP)

  v_channel_code := coalesce(v_sale.ch_code, 'cash');
  -- Akun kas sesuai channel
  -- (mengikuti pola create_sale: cash=1000, qris/transfer/marketplace=1010)
  insert into journal_entries(id, entry_date, memo, ref_type, ref_id, source, status)
  values (v_entry_id, current_date,
          'Retur Penjualan ' || v_sale.invoice_no || coalesce(' — ' || p_reason, ''),
          'RETURN', v_return_id, 'RETURN', 'posted');

  insert into journal_lines(entry_id, account_code, debit, credit) values
    (v_entry_id, '4001', v_refund, 0),           -- Dr Retur Penjualan (contra-revenue)
    (v_entry_id, (case v_channel_code when 'cash' then '1000' else '1010' end), 0, v_refund); -- Cr Kas

  if v_cost_rev > 0 then
    insert into journal_lines(entry_id, account_code, debit, credit) values
      (v_entry_id, '1200', v_cost_rev, 0),       -- Dr Persediaan
      (v_entry_id, '5000', 0, v_cost_rev);       -- Cr HPP
  end if;

  -- Audit log
  insert into audit_log(tenant_id, action, entity_type, entity_id, details)
  values (tx_tenant(), 'CREATE', 'sale_return', v_return_id::text,
          jsonb_build_object('sale_id', p_sale_id, 'refund', v_refund, 'cost_reversal', v_cost_rev));

  return v_return_id;
end; $$;

-- 4. View daftar retur
create or replace view v_sale_returns as
select
  r.id, r.tenant_id, r.sale_id, r.return_date, r.refund_amount,
  r.reason, r.status, r.journal_entry_id, r.created_at,
  s.invoice_no, s.customer_name,
  count(ri.id) as item_count,
  coalesce(sum(ri.qty), 0) as total_qty
from sale_returns r
join sales s on s.id = r.sale_id
left join sale_return_items ri on ri.return_id = r.id
group by r.id, s.invoice_no, s.customer_name;

-- 5. RLS
alter table sale_returns enable row level security;
alter table sale_return_items enable row level security;

create policy sale_returns_tenant on sale_returns for all
  using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy sale_return_items_tenant on sale_return_items for all
  using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- 6. Account code untuk Retur Penjualan (jika belum ada)
insert into chart_of_accounts(account_code, account_name, account_type, level, parent_code, tenant_id)
select '4001', 'Retur Penjualan', 'REVENUE', 3, '4000', tenant_id
from tenants where not exists (
  select 1 from chart_of_accounts where account_code = '4001' and tenant_id = tenants.id
);

commit;

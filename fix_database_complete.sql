-- FIX COMPLETO DO BANCO DE DADOS
-- Execute este script no Editor SQL do Supabase para corrigir os erros 404 e 406.

-- 1. Habilitar Extensões
create extension if not exists "uuid-ossp";

-- 2. Tabela de Fila de Suporte (Support Queue) - Erro 404 support_queue
create table if not exists support_queue (
  id uuid default uuid_generate_v4() primary key,
  requester_id uuid references profiles(id) not null,
  role_needed text not null, -- 'produtor', 'vendedor', 'compositor'
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  active boolean default true
);

-- RLS para Support Queue
alter table support_queue enable row level security;
drop policy if exists "Users can insert their own requests" on support_queue;
create policy "Users can insert their own requests" on support_queue for insert with check (auth.uid() = requester_id);

drop policy if exists "Users can view their own requests" on support_queue;
create policy "Users can view their own requests" on support_queue for select using (auth.uid() = requester_id);

drop policy if exists "Producers can view all requests" on support_queue;
create policy "Producers can view all requests" on support_queue for select using (exists (select 1 from profiles where id = auth.uid() and cargo = 'Produtor'));

drop policy if exists "Sellers can view requests for sellers" on support_queue;
create policy "Sellers can view requests for sellers" on support_queue for select using (role_needed = 'vendedor' and exists (select 1 from profiles where id = auth.uid() and cargo = 'Vendedor'));

drop policy if exists "Composers can view requests for composers" on support_queue;
create policy "Composers can view requests for composers" on support_queue for select using (role_needed = 'compositor' and exists (select 1 from profiles where id = auth.uid() and cargo = 'Compositor'));


-- 3. Tabelas do Vendedor - Erro 406 seller_goals
-- Leads
create table if not exists leads (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references auth.users(id) on delete cascade not null,
  contractor_name text not null,
  event_name text,
  city text,
  event_date timestamp with time zone,
  budget numeric,
  status text check (status in ('novo', 'negociacao', 'fechado', 'perdido')) default 'novo',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seller Goals
create table if not exists seller_goals (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references auth.users(id) on delete cascade not null,
  month int not null,
  year int not null,
  shows_target int default 0,
  revenue_target numeric default 0,
  current_shows int default 0,
  current_revenue numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(seller_id, month, year)
);

-- Proposals
create table if not exists proposals (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references auth.users(id) on delete cascade not null,
  lead_id uuid references leads(id) on delete set null,
  artist_id uuid references profiles(id) on delete set null,
  value numeric,
  status text check (status in ('rascunho', 'enviado', 'aceito', 'rejeitado')) default 'rascunho',
  file_url text,
  observations text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Commissions
create table if not exists commissions (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references auth.users(id) on delete cascade not null,
  lead_id uuid references leads(id) on delete set null,
  amount numeric not null,
  status text check (status in ('pendente', 'pago')) default 'pendente',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Negotiation History
create table if not exists negotiation_history (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references leads(id) on delete cascade not null,
  seller_id uuid references auth.users(id) on delete cascade not null,
  contact_date timestamp with time zone default timezone('utc'::text, now()) not null,
  notes text,
  value_offered numeric,
  next_step text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS para Tabelas de Vendedor
alter table leads enable row level security;
alter table seller_goals enable row level security;
alter table proposals enable row level security;
alter table commissions enable row level security;
alter table negotiation_history enable row level security;

-- Policies simplificadas (recria se existir)
drop policy if exists "Vendedores podem ver seus próprios leads" on leads;
create policy "Vendedores podem ver seus próprios leads" on leads for select using (auth.uid() = seller_id);
drop policy if exists "Vendedores podem inserir seus próprios leads" on leads;
create policy "Vendedores podem inserir seus próprios leads" on leads for insert with check (auth.uid() = seller_id);
drop policy if exists "Vendedores podem atualizar seus próprios leads" on leads;
create policy "Vendedores podem atualizar seus próprios leads" on leads for update using (auth.uid() = seller_id);

drop policy if exists "Vendedores podem ver suas metas" on seller_goals;
create policy "Vendedores podem ver suas metas" on seller_goals for select using (auth.uid() = seller_id);

drop policy if exists "Vendedores podem gerenciar suas propostas" on proposals;
create policy "Vendedores podem gerenciar suas propostas" on proposals for all using (auth.uid() = seller_id);

drop policy if exists "Vendedores podem ver suas comissões" on commissions;
create policy "Vendedores podem ver suas comissões" on commissions for select using (auth.uid() = seller_id);


-- 4. Atualização da Tabela Chats e Notificações (RPC)
alter table chats add column if not exists type text default 'support';
alter table chats add column if not exists participant_ids uuid[] default '{}'; 
alter table chats add column if not exists owner_id uuid references profiles(id);

-- RPC: Send Broadcast
create or replace function send_broadcast_notification(
  p_title text,
  p_message text,
  p_target_role text default null,
  p_link text default null
) returns void as $$
declare
  v_user record;
  v_sender_role text;
begin
  select cargo into v_sender_role from profiles where id = auth.uid();
  if v_sender_role <> 'Produtor' then
    raise exception 'Apenas Produtores podem enviar notificações em massa.';
  end if;
  for v_user in 
    select id from profiles 
    where (p_target_role is null or cargo = p_target_role)
  loop
    insert into notifications (recipient_id, title, message, link, type, read)
    values (v_user.id, p_title, p_message, p_link, 'announcement', false);
  end loop;
end;
$$ language plpgsql security definer;

-- RPC: Clear Chat
create or replace function clear_chat_history(p_chat_id uuid)
returns void as $$
begin
  if not exists (
    select 1 from chats 
    where id = p_chat_id 
    and (
      auth.uid() = ANY(participant_ids) 
      or auth.uid() = artista_id 
      or auth.uid() = assigned_to
      or auth.uid() = owner_id
      or exists (select 1 from profiles where id = auth.uid() and cargo = 'Produtor')
    )
  ) then
    raise exception 'Permissão negada.';
  end if;
  delete from messages where chat_id = p_chat_id;
  delete from chats where id = p_chat_id;
end;
$$ language plpgsql security definer;

-- RPC: Send Notification
create or replace function send_notification(
  p_recipient_id uuid,
  p_title text,
  p_message text,
  p_link text default null
) returns void as $$
begin
  insert into notifications (recipient_id, title, message, link, type, read)
  values (p_recipient_id, p_title, p_message, p_link, 'info', false);
end;
$$ language plpgsql security definer;

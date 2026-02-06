-- Tabela de Leads (Oportunidades de Shows)
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

-- Tabela de Histórico de Negociação
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

-- Tabela de Metas do Vendedor
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

-- Tabela de Propostas
create table if not exists proposals (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references auth.users(id) on delete cascade not null,
  lead_id uuid references leads(id) on delete set null, -- pode ser proposta sem lead cadastrado ainda
  artist_id uuid references profiles(id) on delete set null,
  value numeric,
  status text check (status in ('rascunho', 'enviado', 'aceito', 'rejeitado')) default 'rascunho',
  file_url text, -- URL do PDF gerado ou anexo
  observations text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Comissões
create table if not exists commissions (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references auth.users(id) on delete cascade not null,
  lead_id uuid references leads(id) on delete set null,
  amount numeric not null,
  status text check (status in ('pendente', 'pago')) default 'pendente',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Políticas RLS (Row Level Security)

-- Leads
alter table leads enable row level security;
create policy "Vendedores podem ver seus próprios leads" on leads for select using (auth.uid() = seller_id);
create policy "Vendedores podem inserir seus próprios leads" on leads for insert with check (auth.uid() = seller_id);
create policy "Vendedores podem atualizar seus próprios leads" on leads for update using (auth.uid() = seller_id);
create policy "Produtores podem ver todos os leads" on leads for select using (exists (select 1 from profiles where id = auth.uid() and cargo = 'Produtor'));

-- Negotiation History
alter table negotiation_history enable row level security;
create policy "Vendedores podem ver seu histórico" on negotiation_history for select using (auth.uid() = seller_id);
create policy "Vendedores podem inserir histórico" on negotiation_history for insert with check (auth.uid() = seller_id);
create policy "Produtores podem ver histórico" on negotiation_history for select using (exists (select 1 from profiles where id = auth.uid() and cargo = 'Produtor'));

-- Seller Goals
alter table seller_goals enable row level security;
create policy "Vendedores podem ver suas metas" on seller_goals for select using (auth.uid() = seller_id);
create policy "Produtores podem gerenciar metas" on seller_goals for all using (exists (select 1 from profiles where id = auth.uid() and cargo = 'Produtor'));

-- Proposals
alter table proposals enable row level security;
create policy "Vendedores podem gerenciar suas propostas" on proposals for all using (auth.uid() = seller_id);
create policy "Produtores podem ver propostas" on proposals for select using (exists (select 1 from profiles where id = auth.uid() and cargo = 'Produtor'));

-- Commissions
alter table commissions enable row level security;
create policy "Vendedores podem ver suas comissões" on commissions for select using (auth.uid() = seller_id);
create policy "Produtores podem gerenciar comissões" on commissions for all using (exists (select 1 from profiles where id = auth.uid() and cargo = 'Produtor'));

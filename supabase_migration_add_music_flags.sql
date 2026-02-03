-- Adicionar colunas para controle de produção e exibição na home
alter table musics 
add column if not exists is_beatwap_produced boolean default false,
add column if not exists show_on_home boolean default false;

-- Atualizar políticas se necessário (assumindo que producers podem editar)
-- A política de update para producers já deve existir, mas vale verificar se permite as novas colunas
-- (Geralmente RLS permite update na linha toda se a policy for true)

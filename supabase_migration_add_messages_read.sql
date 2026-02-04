-- Adicionar coluna 'read' na tabela messages para controle de leitura
alter table messages 
add column if not exists read boolean default false;

-- Atualizar linhas existentes para lidas (opcional, mas bom para limpar pendências)
update messages set read = true where read is null;

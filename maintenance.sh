#!/bin/bash

# Script de Backup e Manutenção para BeatWap API
# Realiza backup do banco de dados e limpeza de logs

# Configurações
PROJECT_NAME="beatwap-api"
BACKUP_DIR="/var/backups/beatwap"
DB_PATH="/var/www/beatwapcerto/backend/database.sqlite"
LOG_DIR="/var/log/beatwap"
RETENTION_DAYS=30

# Criar diretórios
mkdir -p "$BACKUP_DIR"/{databases,logs}

# Função de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/maintenance.log"
}

# Backup do banco de dados
backup_database() {
    local backup_file="$BACKUP_DIR/databases/database_$(date +%Y%m%d_%H%M%S).sqlite"
    
    log "Iniciando backup do banco de dados..."
    
    # Parar aplicação temporariamente
    pm2 stop "$PROJECT_NAME"
    
    # Criar backup
    cp "$DB_PATH" "$backup_file"
    
    # Compactar backup
    gzip "$backup_file"
    
    # Reiniciar aplicação
    pm2 start "$PROJECT_NAME"
    
    log "Backup concluído: ${backup_file}.gz"
}

# Limpeza de logs antigos
cleanup_logs() {
    log "Limpando logs antigos..."
    
    # Remover logs de backup antigos
    find "$BACKUP_DIR/databases" -name "*.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR/logs" -name "*.log" -mtime +$RETENTION_DAYS -delete
    
    # Limpar logs do PM2
    pm2 flush "$PROJECT_NAME"
    
    # Limpar logs do sistema
    journalctl --vacuum-time=30d
    
    log "Limpeza de logs concluída"
}

# Verificar integridade do banco de dados
check_database_integrity() {
    log "Verificando integridade do banco de dados..."
    
    # Usar sqlite3 para verificar integridade
    if command -v sqlite3 &> /dev/null; then
        sqlite3 "$DB_PATH" "PRAGMA integrity_check;" > /tmp/db_check.txt
        if grep -q "ok" /tmp/db_check.txt; then
            log "Integridade do banco de dados: OK"
        else
            log "ALERTA: Problemas de integridade detectados no banco de dados"
            cat /tmp/db_check.txt | tee -a "$LOG_DIR/maintenance.log"
        fi
        rm -f /tmp/db_check.txt
    else
        log "sqlite3 não encontrado, pulando verificação de integridade"
    fi
}

# Atualizar sistema (com cuidado)
update_system() {
    log "Verificando atualizações do sistema..."
    
    # Atualizar lista de pacotes
    apt update
    
    # Verificar atualizações de segurança
    apt list --upgradable | grep -i security
    
    # Instalar apenas atualizações de segurança
    apt upgrade -y --only-upgrade
    
    log "Atualização de segurança concluída"
}

# Reinicialização de serviços
restart_services() {
    log "Reiniciando serviços..."
    
    # Reiniciar Nginx
    systemctl restart nginx
    
    # Reiniciar aplicação
    pm2 restart "$PROJECT_NAME"
    
    log "Serviços reiniciados"
}

# Verificar espaço em disco
check_disk_space() {
    local usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    log "Uso do disco: ${usage}%"
    
    if [ "$usage" -gt 80 ]; then
        log "ALERTA: Uso de disco acima de 80%"
        df -h / | tee -a "$LOG_DIR/maintenance.log"
    fi
}

# Main function
main() {
    log "=== INICIANDO MANUTENÇÃO SEMANAL ==="
    
    # Verificar espaço em disco primeiro
    check_disk_space
    
    # Criar backup do banco de dados
    backup_database
    
    # Verificar integridade do banco
    check_database_integrity
    
    # Limpar logs antigos
    cleanup_logs
    
    # Atualizar sistema (opcional - descomente se quiser)
    # update_system
    
    # Reiniciar serviços
    restart_services
    
    log "=== MANUTENÇÃO CONCLUÍDA ==="
}

# Executar main
main
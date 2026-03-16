#!/bin/bash

# Script de Monitoramento para BeatWap API
# Monitora saúde da aplicação, logs e performance

# Configurações
PROJECT_NAME="beatwap-api"
PORT="3001"
DOMAIN="api.beatwap.com.br"
LOG_DIR="/var/log/beatwap"
ALERT_EMAIL="admin@beatwap.com.br"
HEALTH_CHECK_URL="http://localhost:$PORT/health"

# Criar diretório de logs
mkdir -p "$LOG_DIR"

# Função para logar com timestamp
log_with_time() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/monitor.log"
}

# Função para verificar saúde da aplicação
check_health() {
    local response=$(curl -s -w "%{http_code}" "$HEALTH_CHECK_URL" -o /dev/null 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Função para verificar uso de recursos
check_resources() {
    # CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    
    # Memory usage
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
    
    # Disk usage
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    # Log resource usage
    log_with_time "CPU: ${CPU_USAGE}% | Memory: ${MEMORY_USAGE}% | Disk: ${DISK_USAGE}%"
    
    # Alert if usage is high
    if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
        log_with_time "ALERTA: CPU usage alto: ${CPU_USAGE}%"
    fi
    
    if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
        log_with_time "ALERTA: Memory usage alto: ${MEMORY_USAGE}%"
    fi
    
    if [ "$DISK_USAGE" -gt 80 ]; then
        log_with_time "ALERTA: Disk usage alto: ${DISK_USAGE}%"
    fi
}

# Função para verificar logs de erro
check_error_logs() {
    local error_count=$(pm2 logs "$PROJECT_NAME" --lines 100 | grep -i "error" | wc -l)
    
    if [ "$error_count" -gt 0 ]; then
        log_with_time "Encontrados $error_count erros nos logs recentes"
    fi
}

# Função para verificar conectividade externa
check_external_connectivity() {
    if curl -s -f "https://$DOMAIN/health" > /dev/null; then
        log_with_time "Conectividade externa: OK"
    else
        log_with_time "ALERTA: Problema de conectividade externa"
    fi
}

# Função principal de monitoramento
main_monitor() {
    log_with_time "=== Iniciando verificação de monitoramento ==="
    
    # Verificar saúde da aplicação
    if check_health; then
        log_with_time "Health check: OK"
    else
        log_with_time "ALERTA: Health check falhou! Reiniciando aplicação..."
        pm2 restart "$PROJECT_NAME"
        sleep 10
        
        # Verificar novamente após reinício
        if check_health; then
            log_with_time "Aplicação recuperada após reinício"
        else
            log_with_time "CRÍTICO: Aplicação não recuperada após reinício"
        fi
    fi
    
    # Verificar recursos
    check_resources
    
    # Verificar logs de erro
    check_error_logs
    
    # Verificar conectividade externa
    check_external_connectivity
    
    # Status do PM2
    local pm2_status=$(pm2 status "$PROJECT_NAME" | grep "$PROJECT_NAME" | awk '{print $18}')
    log_with_time "PM2 Status: $pm2_status"
    
    log_with_time "=== Verificação concluída ==="
}

# Executar monitoramento
main_monitor

# Gerar relatório diário
generate_daily_report() {
    local report_file="$LOG_DIR/daily_report_$(date +%Y%m%d).log"
    
    {
        echo "=== RELATÓRIO DIÁRIO BEATWAP API ==="
        echo "Data: $(date)"
        echo ""
        echo "STATUS DO SISTEMA:"
        pm2 status "$PROJECT_NAME"
        echo ""
        echo "USO DE RECURSOS:"
        free -h
        echo ""
        df -h
        echo ""
        echo "CONEXÕES ATIVAS:"
        netstat -an | grep ":$PORT" | wc -l
        echo ""
        echo "ERROS RECENTES:"
        pm2 logs "$PROJECT_NAME" --lines 50 | grep -i "error" || echo "Nenhum erro encontrado"
        echo ""
        echo "=== FIM DO RELATÓRIO ==="
    } > "$report_file"
    
    log_with_time "Relatório diário gerado: $report_file"
}

# Se for meia-noite, gerar relatório diário
if [ "$(date +%H:%M)" = "00:00" ]; then
    generate_daily_report
fi
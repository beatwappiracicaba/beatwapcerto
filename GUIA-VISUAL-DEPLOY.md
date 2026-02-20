# 🚀 GUIA VISUAL - Deploy Backend BeatWap no CloudClusters (Windows)

## 📋 **RESUMO RÁPIDO**
- **IP:** 108.181.197.180
- **Porta:** 19931
- **Banco:** postgresql-208539-0.cloudclusters.net:19931
- **Script Pronto:** `deploy-automatico-windows.ps1`

---

## 🎯 **OPÇÃO 1: AUTOMÁTICO (RECOMENDADO)**

### Passo 1: Executar Script Automático
```powershell
# Como Administrador
 cd C:\Users\Família\Desktop\site inicio
 .\deploy-automatico-windows.ps1
```

**O script faz TUDO sozinho:**
✅ Testa conexão com VPS
✅ Instala PuTTY (se necessário)
✅ Cria script Linux automaticamente
✅ Abre PuTTY pronto para deploy
✅ Copia comandos para área de transferência

---

## 🖥️ **OPÇÃO 2: MANUAL COM PUTTY**

### Passo 1: Baixar PuTTY
1. Acesse: https://www.putty.org/
2. Clique: "Download PuTTY"
3. Baixe: `putty.exe` (versão Windows)

### Passo 2: Configurar PuTTY
![PuTTY Config](https://i.imgur.com/putty-config.png)

**Preencha:**
- **Host Name:** `108.181.197.180`
- **Port:** `22`
- **Connection Type:** `SSH`

### Passo 3: Conectar
Clique em **"Open"**

### Passo 4: Login
```
login as: root
password: [sua senha da VPS]
```

### Passo 5: Executar Deploy
**Copie e cole este comando completo:**

```bash
# ⬇️ COPIE ESTE COMANDO COMPLETO ⬇️
curl -o deploy-cloudclusters.sh https://raw.githubusercontent.com/beatwappiracicaba/beatwapproducoes/master/backend/deploy-cloudclusters.sh && bash deploy-cloudclusters.sh
```

**Para colar no PuTTY:** Clique com botão direito no terminal

---

## 🧪 **TESTAR CONEXÃO**

### No PowerShell:
```powershell
# Testar SSH
Test-NetConnection -ComputerName 108.181.197.180 -Port 22

# Testar Backend
Test-NetConnection -ComputerName 108.181.197.180 -Port 19931
```

### No Navegador:
```
http://108.181.197.180:19931/api/profiles
```

---

## 📊 **COMANDOS ÚTEIS NO PUTTY**

```bash
# Ver status do backend
pm2 status

# Ver logs
pm2 logs beatwap-backend --lines 20

# Reiniciar backend
pm2 restart beatwap-backend

# Ver todas as rotas disponíveis
curl http://localhost:19931/api/profiles
curl http://localhost:19931/api/home/producers
curl http://localhost:19931/api/releases
```

---

## 🆘 **SOLUÇÃO DE PROBLEMAS**

### "Connection Timed Out"
```powershell
# Verificar se VPS está online
Test-NetConnection -ComputerName 108.181.197.180 -Port 22

# Se falhar:
# 1. Acesse painel CloudClusters
# 2. Verifique se VPS está ligada
# 3. Confirme IP correto
```

### "Permission Denied"
- Verifique senha do root
- Tente resetar senha no painel CloudClusters

### "Port 22: Connection Refused"
- Tente porta 2222: `ssh -p 2222 root@108.181.197.180`
- Verifique firewall no painel CloudClusters

### Backend não responde na 19931
```bash
# Dentro do PuTTY:
pm2 status
pm2 logs beatwap-backend

# Se não estiver rodando:
cd /cloudclusters/backend
pm2 start index.js --name "beatwap-backend"
```

---

## 🎯 **CONFIGURAÇÃO FRONTEND**

### Cloudflare Pages:
1. Vá em **Settings** → **Environment Variables**
2. Adicione:
   ```
   REACT_APP_BACKEND_URL=http://108.181.197.180:19931
   ```

---

## 📞 **SUPORTE**

Se tiver problemas:
1. **Verifique logs:** `pm2 logs beatwap-backend`
2. **Confirme conexão:** `Test-NetConnection -ComputerName 108.181.197.180 -Port 19931`
3. **Teste banco:** `psql -U Alangodoy -h postgresql-208539-0.cloudclusters.net -p 19931 -d BeatWap`

---

## 🚀 **COMECE AGORA!**

**Escolha seu caminho:**

### 🔥 **RÁPIDO (Automático)**
```powershell
# Como Administrador
.\deploy-automatico-windows.ps1
```

### ⚙️ **MANUAL (PuTTY)**
1. Baixe PuTTY
2. Conecte: `108.181.197.180:22`
3. Execute: `bash deploy-cloudclusters.sh`

**Ambos levam ao mesmo resultado!** 🎉

---

*Após deploy bem sucedido, teste: http://108.181.197.180:19931/api/profiles*
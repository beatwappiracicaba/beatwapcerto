# 🎯 INSTRUÇÕES PARA ACESSAR VPS CLOUDCLUSTERS

## 🔑 **CONEXÃO SSH CORRETA**

### **Acesse o Painel CloudClusters:**
1. Vá para: https://app.cloudclusters.io/
2. Faça login
3. Vá em: **Services** → **PostgreSQL** → **BeatWap**
4. Procure: **SSH Access** ou **Console**

### **Informações que precisamos:**
- **SSH Host:** (geralmente é o mesmo IP ou um host específico)
- **SSH Port:** (pode ser 22, 2222, ou outra)
- **SSH User:** (root ou outro usuário)
- **SSH Password:** (fornecido pelo CloudClusters)

### **Alternativa: Use o Console Web**
Se SSH não funcionar, use o **Console Web** direto no painel CloudClusters.

---

## 🗄️ **CONEXÃO POSTGRESQL** (Informações do CloudClusters)

### **Conexão Local (dentro da VPS):**
```bash
# Como superusuário postgres
psql -U postgres

# Como usuário Alangodoy
psql -U Alangodoy -d BeatWap
```

### **Conexão Remota (se permitido):**
```bash
psql -h postgresql-208539-0.cloudclusters.net -p 19931 -U Alangodoy -d BeatWap
```

---

## 🚀 **PRÓXIMOS PASSOS**

1. **Acesse o painel CloudClusters agora**
2. **Encontre as credenciais SSH**
3. **Use o console web ou SSH para conectar**
4. **Execute nosso script de deploy**

**Assim que você tiver as credenciais corretas, eu faço o deploy imediatamente!** 🎯
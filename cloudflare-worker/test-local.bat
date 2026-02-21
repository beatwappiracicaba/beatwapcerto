# Testar API localmente
curl -X POST http://localhost:8787/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alangodoygtr@gmail.com",
    "senha": "@Aggtr4907"
  }'
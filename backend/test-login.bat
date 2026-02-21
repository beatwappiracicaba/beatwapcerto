# Testar login
curl -X POST http://localhost:10000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alangodoygtr@gmail.com",
    "senha": "@Aggtr4907"
  }'
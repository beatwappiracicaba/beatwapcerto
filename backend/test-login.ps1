$body = @{
    email = "alangodoygtr@gmail.com"
    senha = "@Aggtr4907"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:10000/api/login" -Method POST -Body $body -ContentType "application/json"
Write-Host "Resposta do login:"
$response | ConvertTo-Json -Depth 10
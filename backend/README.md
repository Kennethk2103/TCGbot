TO START DOCKER: 
    -docker compose up --wait 
    -Wait for Container mongo-mongo-1 to say "Healthy"
    -Connect with mongodb://127.0.0.1:27017/?replicaSet=rs0
    -On Linux you will also need to add "127.17.0.1 host.docker.internal" to /etc/hosts 

Troubleshooting (Windows, but the process should be similar on Linux): 
    - if you can't connect the the mongodb try the following 
        - Get-Process -Name mongod ("pgrep mongod" on linux)
        - If you get a non-error return value do "Stop-Process <\ID>" from a terminal with admin authority ("kill <\PID>" on Linux)

TO RUN SERVER: 
    -cd backend 
    -node server.js
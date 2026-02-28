TO UPDATE BACKEND
    -cd backend 
    - docker build -t my-discord-bot:latest .
    - docker save -o my-discord-bot.tar my-discord-bot:latest
    - Move it to the Containers dir 
    - docker load -i my-discord-bot.tar
    - Start 

TO START DOCKER (This will also start the backend): 
    -docker compose up --wait 
    -Wait for Container mongo-mongo-1 to say "Healthy"
    -Connect with mongodb://host.docker.internal:27017/?replicaSet=rs0
    -On Linux you will also need to add "127.17.0.1 host.docker.internal" to /etc/hosts -> unsure about this, this step might be useless now

Troubleshooting (Windows, but the process should be similar on Linux): 
    - if you can't connect the the mongodb try the following 
        - Get-Process -Name mongod ("pgrep mongod" on linux)
        - If you get a non-error return value do "Stop-Process <\ID>" from a terminal with admin authority ("kill <\PID>" on Linux)

Troubleshooting docker 
    - If you get a connection error to the database, you must ensure the promary host name is host.docker.internal:27017
        - Bring down the containers with docker-compose down -v
        - Bring them back up with docker-compose up -d
        - enter docker and do docker exec -it containers-mongo1-1 mongosh
        - cfg = rs.conf()
        - cfg.members[0].host = "host.docker.internal:27017"
        - rs.reconfig(cfg, { force: true })
        - rs.status() -> verify name: 'host.docker.internal:27017'
        - Exit, then do docker restart containers-backend-1
        - Check the logs with docker logs containers-backend-1

To reset the db
    - docker-compose down
    - docker volume rm containers_mongo1_data containers_mongo1_config

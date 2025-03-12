# Backend Challenge: Google Workspace Event Integration

<h1 align="center">
  <br>
  <br>
    Backend Challenge Solution
  <br>
</h1>

<p align="center">
* ## Key Features

* API and Background Services, utilizing Bull.mq
* Dockerized
* Resilient

* ## Technology Stack

* Node.js
* Mongo Db
* Redis
  
</p>

## How To Use

1. Non-dockerized solution

* Clone the git repo locally

```bash
# Clone this repository
$ git clone https://github.com/Bleron213/backend-challenge
```

# How to run in your local machine

* Open the folder where the solution was cloned
* Open terminal
* Move to the backend folder
* Inside the backend folder, create a file named .env and place these environment variables inside

Note: In a production environment, we would never expose API key and Encryption key like this. For demo purposes, this is fine.
# .env file

API_KEY=bBJ4Gig5CEVzTWM8l2nVCzX8Ht7IohuAFgsKK1puNmGU4FZormELBoRtjPySs4bAX6st4VOO2Vx8CSxoiQQuzWrrhEWlw2mwF17Boo5hun9Wo0RZZGhgsoK7uXSBD8AR
MONGO_URI=mongodb://localhost:27017/sourcedb
ENCRYPTION_KEY=0d932b4a920075ca6bd78fb589b9815d878b1bd06fbf1f7477b69102e8967908
REDIS_PORT=6379
REDIS_HOST=localhost
NODE_DEBUG=bull
NODE_ENV=DEVELOPMENT
CALLBACK_API_HOOK=http://localhost:8080/Hooks/SendLog 

* Run these three docker commands

```bash
$ docker run --name mongodb -d -p 27017:27017 mongo
$ docker run --name redis-server -p 6379:6379 -d redis
$ docker run -d -p 8080:8080 --name callbackapi-container -e ASPNETCORE_ENVIRONMENT=Development bleronqorri/callbackapi:latest
```

* Run npm install and npm start

```bash
# npm install
```

and

```bash
# npm start
```

* Backend challenge should now be up and running. You can inspect the console to see logs. Alternatively, you can connect to MongoDb to view data inside the sourcedb and you can connect to Redis Insights to view the Job scheduling inside Redis.

2. Dockerized solution

* Clone the git repo locally

```bash
# Clone this repository
$ git clone https://github.com/Bleron213/backend-challenge
```

# How to run in your local machine

* Open the folder where the solution was cloned
* Move to the backend folder
* Inside the backend folder, create a file named .env and place these environment variables inside

Note: In a production environment, we would never expose API key and Encryption key like this. For demo purposes, this is fine.

# .env file

API_KEY=bBJ4Gig5CEVzTWM8l2nVCzX8Ht7IohuAFgsKK1puNmGU4FZormELBoRtjPySs4bAX6st4VOO2Vx8CSxoiQQuzWrrhEWlw2mwF17Boo5hun9Wo0RZZGhgsoK7uXSBD8AR
ENCRYPTION_KEY=0d932b4a920075ca6bd78fb589b9815d878b1bd06fbf1f7477b69102e8967908
NODE_ENV=DEVELOPMENT

* Inside the backend folder, open terminal and run

```bash
# Clone this repository
$ docker-compose up
```

* Backend challenge should now be up and running. You can inspect the console to see logs. Alternatively, you can connect to MongoDb to view data inside the sourcedb and you can connect to Redis Insights to view the Job scheduling inside Redis.

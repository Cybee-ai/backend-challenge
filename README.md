# Backend Challenge: Google Workspace Event Integration

<h1 align="center">
  Backend Challenge Solution
</h1>

  <strong>Key Features:</strong><br>
  * API and Background Services, utilizing Bull.mq<br>
  * Dockerized<br>
  * Resilient<br>

  <strong>Technology Stack:</strong><br>
  * Node.js<br>
  * MongoDB<br>
  * Redis<br>

---

## How To Use

### 1. Non-Dockerized Solution

#### Clone the Repository

```bash
# Clone this repository
$ git clone https://github.com/Bleron213/backend-challenge
```

#### Setting Up the Local Environment

1. Open the folder where the solution was cloned.
2. Open a terminal and move to the `backend` folder.
3. Inside the `backend` folder, create a file named `.env` and place these environment variables inside:

```dotenv
API_KEY=bBJ4Gig5CEVzTWM8l2nVCzX8Ht7IohuAFgsKK1puNmGU4FZormELBoRtjPySs4bAX6st4VOO2Vx8CSxoiQQuzWrrhEWlw2mwF17Boo5hun9Wo0RZZGhgsoK7uXSBD8AR
MONGO_URI=mongodb://localhost:27017/sourcedb
ENCRYPTION_KEY=0d932b4a920075ca6bd78fb589b9815d878b1bd06fbf1f7477b69102e8967908
REDIS_PORT=6379
REDIS_HOST=localhost
NODE_DEBUG=bull
NODE_ENV=DEVELOPMENT
CALLBACK_API_HOOK=http://localhost:8080/Hooks/SendLog
```

4. Run these Docker commands:

```bash
$ docker run --name mongodb -d -p 27017:27017 mongo
$ docker run --name redis-server -p 6379:6379 -d redis
$ docker run -d -p 8080:8080 --name callbackapi-container -e ASPNETCORE_ENVIRONMENT=Development bleronqorri/callbackapi:latest
```

5. Install dependencies and start the backend:

```bash
# npm install
$ npm install
```

```bash
# npm start
$ npm start
```

The backend challenge should now be up and running. You can inspect the console to see logs. Alternatively, you can connect to MongoDB to view data inside the `sourcedb` and connect to Redis Insights to view the job scheduling inside Redis.

### 2. Dockerized Solution

#### Clone the Repository

```bash
# Clone this repository
$ git clone https://github.com/Bleron213/backend-challenge
```

#### Setting Up the Local Environment

1. Open the folder where the solution was cloned.
2. Open a terminal and move to the `backend` folder.
3. Inside the `backend` folder, create a file named `.env` and place these environment variables inside:

```dotenv
API_KEY=bBJ4Gig5CEVzTWM8l2nVCzX8Ht7IohuAFgsKK1puNmGU4FZormELBoRtjPySs4bAX6st4VOO2Vx8CSxoiQQuzWrrhEWlw2mwF17Boo5hun9Wo0RZZGhgsoK7uXSBD8AR
ENCRYPTION_KEY=0d932b4a920075ca6bd78fb589b9815d878b1bd06fbf1f7477b69102e8967908
NODE_ENV=DEVELOPMENT
```

4. Start the Docker containers:

```bash
# Start the containers with Docker Compose
$ docker-compose up
```

The backend challenge should now be up and running. You can inspect the console to see logs. Alternatively, you can connect to MongoDB to view data inside the `sourcedb` and connect to Redis Insights to view the job scheduling inside Redis.

---

## Notes

- In a production environment, we would never expose API keys or encryption keys like this. For demo purposes, this is fine.

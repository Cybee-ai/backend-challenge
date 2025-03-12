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

#### 1. Swagger documentation for endpoints

Open http://localhost:3000/swagger/ and view the documented endpoints.  
To use them, you need to provide the API key defined in `.env` variables.  
We have exposed it here - but in a production environment, this would be the first layer of security.

![Swagger](https://github.com/user-attachments/assets/85d4b55b-7925-469a-a31a-b597b0bd9d8d)

#### 2. Redis Insight

We can also view job schedules internals in Redis Insights.  
Open Redis Insights and connect to the Redis running in the Docker container.

![Redis Insights](https://github.com/user-attachments/assets/1e476a03-a521-4472-b5bd-c71f2b2e22ea)

#### 3. MongoDB

We can also view created sources and logs in the database.  
Open Mongo Compass and connect to MongoDB running in Docker.  

We can see the following info:

![MongoDB](https://github.com/user-attachments/assets/8cdb36d7-75e9-4b24-9f3a-c86f674ccfac)

#### 4. Resilience in Action

![Resilience Logs](https://github.com/user-attachments/assets/23b52a9a-f5e6-4c0a-a12c-ff87dee9a704)

Here we can see logs being processed. Due to the aggressive rate limiter in the callback API, retries will be quite common.

---

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

#### 1. Swagger documentation for endpoints

![Swagger](https://github.com/user-attachments/assets/85d4b55b-7925-469a-a31a-b597b0bd9d8d)

#### 2. Redis Insight

![Redis Insights](https://github.com/user-attachments/assets/1e476a03-a521-4472-b5bd-c71f2b2e22ea)

#### 3. MongoDB

![MongoDB](https://github.com/user-attachments/assets/8cdb36d7-75e9-4b24-9f3a-c86f674ccfac)

#### 4. Resilience in Action

![Resilience Logs](https://github.com/user-attachments/assets/23b52a9a-f5e6-4c0a-a12c-ff87dee9a704)

---

## Notes

- In a production environment, we would never expose API keys or encryption keys like this. For demo purposes, this is fine.

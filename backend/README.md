# 🚀 Google Workspace Event Integration API

## 📖 Overview

This project is a **Fastify-based REST API** that integrates with **Google Workspace Admin SDK** to fetch event logs. It allows users to:

- **Register a new source** (Google Workspace instance) with authentication credentials.
- **Fetch and process logs** periodically using BullMQ.
- **Forward logs** to a specified webhook.
- **Handle API rate limits**, credential expiration, and retries efficiently.

## 🛠️ Tech Stack

- **Fastify** - Lightweight and fast Node.js framework.
- **MongoDB** - Stores sources and logs.
- **Redis** - Used for caching and job scheduling.
- **BullMQ** - Manages job processing and retries.
- **Google Admin SDK** - Fetches logs from Google Workspace.

---

## ⚙️ Setup & Installation

### 1️⃣ Clone the Repository

```sh
git clone https://github.com/your-username/google-workspace-event-integration.git
cd google-workspace-event-integration
```

### 2️⃣ Install Dependencies

```sh
yarn install
```

### 3️⃣ Set Up Environment Variables

Create a `.env` file in the root directory:

```ini
PORT=3000
MONGO_URI=mongodb://localhost:27017/google_workspace_logs
REDIS_HOST=localhost
REDIS_PORT=6379
ENCRYPTION_KEY=your-64-char-hex-key
NODE_ENV=development
QUEUE_CONCURRENCY=3
```

- **`ENCRYPTION_KEY`** must be a **64-character hex string**.
- **`MONGO_URI`** should point to your MongoDB instance.
- **`REDIS_HOST` & `REDIS_PORT`** should match your Redis setup.

### 4️⃣ Start MongoDB & Redis Locally

If you're running services manually:

```sh
docker run -d --name mongodb -p 27017:27017 mongo
docker run -d --name redis -p 6379:6379 redis
```

### 5️⃣ Start the API

```sh
yarn start
```

Your API will be available at **`http://localhost:3000`**.

---

## 🐳 Running with Docker

To run the API along with MongoDB & Redis using **Docker Compose**:

```sh
docker-compose up --build
```

This will:

- Start **MongoDB** & **Redis**.
- Build & run the **Fastify API**.
- Expose the API on **port 3000**.

---

## 🔌 API Endpoints

### 📌 **1. Register a Source**

```http
POST /sources
```

#### **Request Body (JSON)**

```json
{
  "sourceType": "google_workspace",
  "credentials": {
    "clientEmail": "your-service-account-email",
    "privateKey": "your-private-key",
    "scopes": ["admin.googleapis.com"]
  },
  "logFetchInterval": 300,
  "callbackUrl": "https://your-callback-url.com/webhook"
}
```

#### **Response**

```json
{
  "id": "67d08b7d3c3b38523d1aee5a",
  "sourceType": "google_workspace",
  "logFetchInterval": 300,
  "callbackUrl": "https://your-callback-url.com/webhook"
}
```

---

### 📌 **2. Get All Sources**

```http
GET /sources
```

#### **Response**

```json
[
  {
    "id": "67d08b7d3c3b38523d1aee5a",
    "sourceType": "google_workspace",
    "logFetchInterval": 300,
    "callbackUrl": "https://your-callback-url.com/webhook"
  }
]
```

---

### 📌 **3. Remove a Source**

```http
DELETE /sources/:id
```

#### **Response**

```json
{
  "message": "Source deleted successfully"
}
```

---

## 📦 Deployment

### 1️⃣ **Building a Production Docker Image**

```sh
docker build -t google-workspace-api .
docker run -p 3000:3000 google-workspace-api
```

### 2️⃣ **Deploying to a Cloud Provider**

- **AWS ECS / DigitalOcean Apps / Google Cloud Run**
- **MongoDB Atlas** for cloud database
- **Managed Redis (AWS ElastiCache, Upstash, etc.)**

---

## 🔍 Troubleshooting

### 1️⃣ **Database Connection Issues**

- Ensure **MongoDB & Redis are running** (`docker ps`).
- Check `.env` file values.

### 2️⃣ **Job Processing Delays**

- Increase `QUEUE_CONCURRENCY` in `.env`.
- Ensure Redis is not overloaded.

### 3️⃣ **Google API Errors**

- Check **Google Admin SDK permissions**.
- Ensure the **Service Account has the required IAM roles**.

---

## 📜 License

This project is licensed under **MIT License**.

🚀 **Happy coding!**

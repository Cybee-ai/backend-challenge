# Backend Challenge: Google Workspace Event Integration

## Introduction
Welcome to the **Cybee.ai Backend Challenge**!  

This challenge will test your ability to **integrate with a cloud event source**, specifically **Google Workspace Admin SDK logs**, and build a system that:
1. **Accepts a new source** (`POST /add-source`) with authentication credentials.
2. **Periodically fetches logs** from Google Workspace.
3. **Processes and forwards logs** to a specified callback URL.
4. **Handles edge cases** like API rate limits, failures, and credential expiration.

If you complete the challenge successfully, you’ll get a chance to talk with our team at Cybee.ai!

---

## Tech Stack Requirements
Your solution must be built using:

- Node.js
- Fastify (for API development)
- MongoDB (for storing sources and logs)
- Redis (for caching and job scheduling)
- Elasticsearch (for log indexing) (optional but a plus)
- Google Workspace Admin SDK (for fetching event logs)

## Requirements

### 1. Build a Secure REST API
Develop a **Fastify-based API** that allows users to connect a cloud event source and receive logs.

#### Endpoints
- `POST /add-source`
  - Accepts **Google Workspace** as a source type.
  - Stores API credentials securely.
  - Validates credentials before storing.
  
- `DELETE /remove-source/:id`
  - Removes an existing event source.

- `GET /sources`
  - Returns a list of active sources.

---

### 2. Source Configuration & Data Model
When a user adds a Google Workspace integration, the system should store:
```json
{
  "id": "uuid",
  "sourceType": "google_workspace",
  "credentials": {
    "clientEmail": "string",
    "privateKey": "string",
    "scopes": ["admin.googleapis.com"]
  },
  "logFetchInterval": 300,
  "callbackUrl": "https://example.com/webhook"
}
```
**Notes:**
- Credentials should be **stored securely** (e.g., encrypted in MongoDB).
- `logFetchInterval` defines how often logs should be fetched (in seconds).
- `callbackUrl` is where processed logs should be sent.

---

### 3. Fetch & Forward Logs Automatically
- Once a source is added, the system should:
  - **Schedule a job** to fetch logs at `logFetchInterval` (e.g., using a queue like BullMQ).
  - Call **Google Workspace Admin SDK** (`Reports API`) to fetch **audit logs**.
  - **Forward logs** to the `callbackUrl` of the source.
  - **Retry failed requests** and handle rate limits.

**Example Log from Google Workspace:**
```json
{
  "id": "log-id",
  "timestamp": "2024-03-10T12:00:00Z",
  "actor": {
    "email": "admin@example.com",
    "ipAddress": "192.168.1.1"
  },
  "eventType": "LOGIN",
  "details": {
    "status": "SUCCESS"
  }
}
```

---

### 4. Handle Edge Cases
Your system should properly handle:
**API rate limits** – Backoff and retry.  
**Credential expiration** – Detect and alert the user.  
**Callback failures** – Retry failed webhook deliveries.  
**Duplicate logs** – Ensure logs are not duplicated.  
**High availability** – Ensure logs keep flowing even if one instance restarts.  

---

### 5. Deployment & Bonus
- (Required) Provide a **README** with:
  - Setup instructions.
  - API documentation.
  - Explanation of how retries and scheduling work.
- (Bonus) Deploy the solution using **Docker & a cloud provider**.
- (Bonus) Implement **monitoring** (e.g., log metrics to Elasticsearch).

---

## How to Submit
1. Fork this repository and implement your solution in a `backend/` folder.
2. Add a `README.md` with setup and usage instructions.
3. Submit a pull request.

If your solution meets the challenge requirements, we’ll reach out to schedule a conversation. Looking forward to seeing your work!


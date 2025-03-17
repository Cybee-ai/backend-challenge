# Google Workspace Event Integration

I've built a backend service that integrates with Google Workspace Admin SDK to fetch, process, and forward event logs.

## Features

As part of this project, I've implemented:
- A **secure API** for managing Google Workspace event sources
- **Automated log fetching** at configurable intervals
- **Reliable log forwarding** to webhook endpoints with retry logic
- **Robust error handling** for API rate limits, credential expiration, and more
- **High availability** design to ensure logs keep flowing
- **Comprehensive monitoring** with Elasticsearch and Kibana dashboards
- **Cloud-ready deployment** with GCP configuration files

## Tech Stack

For this project, I chose:
- **Node.js** with TypeScript
- **Fastify** for API development
- **MongoDB** for storing sources and logs
- **Redis** for caching and job scheduling
- **BullMQ** for reliable job processing
- **Elasticsearch** for metrics and monitoring
- **Google Workspace Admin SDK** for fetching event logs

## Prerequisites

To run this application, you'll need:
- Node.js 18 or higher
- MongoDB
- Redis
- Google Workspace Admin account with API access

## Installation

### Local Development

1. Clone my repository:
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on the provided `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration values.

5. Build the TypeScript code:
   ```bash
   npm run build
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

### Docker Deployment

I've set up Docker for easy deployment:
```bash
docker-compose up -d
```

## Cloud Deployment

I've made this application ready for deployment to Google Cloud Platform. See the [DEPLOYMENT.md](./DEPLOYMENT.md) file for detailed instructions on deploying to:

- Google Cloud Run (serverless)
- Google Kubernetes Engine (GKE)

My deployment includes:
- Multi-stage Docker builds for optimized container images
- Cloud Build configuration for CI/CD
- Kubernetes manifests for orchestration
- Secret management for sensitive data
- Monitoring and logging integration

## Monitoring

I've implemented comprehensive monitoring using Elasticsearch:

- **API metrics**: Request rates, response times, and status codes
- **Log processing metrics**: Fetch and forward rates, success/failure counts
- **System metrics**: Memory usage, CPU usage, and uptime
- **Source metrics**: Active sources and source operations

### Kibana Dashboard

I've created a pre-configured Kibana dashboard in the `elasticsearch` directory. See the [Elasticsearch README](./elasticsearch/README.md) for setup instructions.

The dashboard provides visualizations for:
- API request rates and response times
- Log fetch and forward metrics
- Active sources count
- System performance metrics

## API Documentation

The API documentation is available at `/documentation` when the server is running.

### Endpoints

#### `POST /api/add-source`

Add a new Google Workspace event source.

**Request Body:**
```json
{
  "sourceType": "google_workspace",
  "credentials": {
    "clientEmail": "service-account@project-id.iam.gserviceaccount.com",
    "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    "scopes": ["https://www.googleapis.com/auth/admin.reports.audit.readonly"]
  },
  "logFetchInterval": 300,
  "callbackUrl": "https://example.com/webhook"
}
```

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "id": "60f7b0b9e6b3f3001c8f0b1e",
    "sourceType": "google_workspace",
    "logFetchInterval": 300,
    "callbackUrl": "https://example.com/webhook",
    "isActive": true,
    "createdAt": "2023-07-21T12:00:00.000Z"
  }
}
```

#### `DELETE /api/remove-source/:id`

Remove an existing event source.

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "id": "60f7b0b9e6b3f3001c8f0b1e",
    "message": "Source removed successfully"
  }
}
```

#### `GET /api/sources`

Get a list of all event sources.

**Response:**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": "60f7b0b9e6b3f3001c8f0b1e",
      "sourceType": "google_workspace",
      "logFetchInterval": 300,
      "callbackUrl": "https://example.com/webhook",
      "lastFetchTimestamp": "2023-07-21T12:05:00.000Z",
      "isActive": true,
      "createdAt": "2023-07-21T12:00:00.000Z",
      "updatedAt": "2023-07-21T12:05:00.000Z"
    }
  ]
}
```

#### `GET /api/health`

Check the health of the service.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2023-07-21T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production"
}
```

## Log Format

When logs are forwarded to the callback URL, they follow this format:

```json
{
  "sourceId": "60f7b0b9e6b3f3001c8f0b1e",
  "logs": [
    {
      "id": "log-id-1",
      "timestamp": "2023-07-21T12:00:00.000Z",
      "actor": {
        "email": "user@example.com",
        "ipAddress": "192.168.1.1"
      },
      "eventType": "LOGIN",
      "details": {
        "status": "SUCCESS",
        "loginType": "password"
      },
      "sourceId": "60f7b0b9e6b3f3001c8f0b1e"
    }
  ]
}
```

## Architecture

### Log Fetching Process

Here's how I've designed the log fetching process:
1. When a source is added, a schedule is created based on the `logFetchInterval`.
2. At each interval, a job is added to the `log-fetch` queue.
3. The worker processes the job by:
   - Authenticating with Google using the stored credentials
   - Fetching logs since the last fetch time
   - Storing new logs in MongoDB with deduplication
   - Adding a job to the `log-forward` queue for the new logs

### Log Forwarding Process

For log forwarding, I've implemented:
1. A `log-forward` queue that processes jobs to send logs to callback URLs.
2. A worker that:
   - Retrieves the logs from MongoDB
   - Transforms them to the expected format
   - Sends them to the callback URL
   - Updates the logs as sent if successful

### Error Handling

I've implemented robust error handling for:
- **API Rate Limits**: Using an exponential backoff retry strategy
- **Credential Expiration**: Marking sources as inactive when credentials fail
- **Callback Failures**: Retrying failed webhook deliveries with exponential backoff
- **Duplicate Logs**: Using a compound index to ensure logs are not duplicated

## About Me

This project was developed by Mohammad Hamarsheh as part of the Cybee.ai Backend Challenge.

## License

MIT 
# Google Workspace Event Integration Challenge

A scalable service that fetches logs from Google Workspace and forwards them to a webhook, with built-in monitoring, retries, and scheduling capabilities.

## Architecture

- **Backend**: Node.js with Fastify
- **Queue**: BullMQ with Redis
- **Database**: MongoDB
- **Monitoring**: Elasticsearch
- **Containerization**: Docker

## Setup Instructions

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd backend-challenge
```

2. Start the services:
```bash
docker compose up -d
```

The application will be available at `http://localhost:3000`.

### Environment Variables

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/cybee
REDIS_HOST=redis
REDIS_PORT=6379
ELASTICSEARCH_NODE=http://elasticsearch:9200
ENCRYPTION_KEY=your_secure_key
```

## API Documentation

### Sources API

#### Create a Source
```http
POST /api/sources
Content-Type: application/json

{
  "sourceType": "google_workspace",
  "credentials": {
    "client_id": "your_client_id",
    "client_secret": "your_client_secret",
    "refresh_token": "your_refresh_token"
  },
  "callbackUrl": "https://your-webhook.com/logs",
  "logFetchInterval": 30
}
```

#### Get All Sources
```http
GET /api/sources
```

#### Get Source by ID
```http
GET /api/sources/:id
```

#### Update Source
```http
PUT /api/sources/:id
Content-Type: application/json

{
  "callbackUrl": "https://new-webhook.com/logs",
  "logFetchInterval": 60
}
```

#### Delete Source
```http
DELETE /api/sources/:id
```

## Job Scheduling and Retry Mechanism

### Scheduling
- Uses BullMQ for reliable job scheduling
- Each source has its own recurring job based on `logFetchInterval`
- Jobs are distributed across workers using Redis
- Stalled job detection with 60s interval
- Automatic cleanup of completed jobs (keeps last 10)

### Retry Strategy
```javascript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000  // Base delay of 2 seconds
  }
}
```

- Failed jobs are retried up to 3 times
- Exponential backoff between retries
- Failed jobs are kept for 24 hours for inspection
- Job status is tracked in MongoDB

## Monitoring

### Elasticsearch Integration
- Log metrics stored in Elasticsearch
- Indexed data includes:
  - Source ID
  - Activity Type
  - Application
  - Timestamp
  - Error states

### Health Checks
- `/health` endpoint for service health
- Redis connection monitoring
- MongoDB connection status
- Elasticsearch cluster health

### Error Handling
- Comprehensive error logging
- Invalid credential detection
- Webhook delivery confirmation
- Rate limiting protection

## Docker Deployment

The application is containerized using Docker with the following services:
- Application (Node.js)
- MongoDB (data persistence)
- Redis (job queue)
- Elasticsearch (monitoring)

### Container Health Checks
```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
  interval: 10s
  timeout: 5s
  retries: 3
```

### Resource Management
- Elasticsearch memory limited to 256MB
- Redis persistence disabled for performance
- MongoDB with persistent volume

## Cloud Deployment (AWS Example)

1. Push Docker images to ECR:
```bash
aws ecr get-login-password --region region | docker login --username AWS --password-stdin aws_account_id.dkr.ecr.region.amazonaws.com
docker tag backend-challenge:latest aws_account_id.dkr.ecr.region.amazonaws.com/backend-challenge:latest
docker push aws_account_id.dkr.ecr.region.amazonaws.com/backend-challenge:latest
```

2. Deploy using ECS:
- Use ECS Fargate for serverless container management
- Set up Application Load Balancer
- Configure Auto Scaling based on queue size
- Use EFS for persistent storage

## Security Considerations

- Credentials encrypted at rest
- HTTPS required for webhook endpoints
- Rate limiting on API endpoints
- No sensitive data in logs
- Regular security updates

## Performance Optimization

- Connection pooling for MongoDB
- Redis queue optimization
- Elasticsearch index lifecycle management
- Efficient log batching
- Concurrent job processing

## Troubleshooting

Common issues and solutions:
1. Redis connection errors: Check Redis container health
2. Job processing delays: Verify worker configuration
3. Webhook failures: Check network connectivity
4. Invalid credentials: Verify Google Workspace setup

## Development

### Local Setup
```bash
npm install
npm start
```

### Testing
```bash
npm test
```

### Code Style
- ESLint configuration
- Prettier formatting
- Git hooks for pre-commit checks

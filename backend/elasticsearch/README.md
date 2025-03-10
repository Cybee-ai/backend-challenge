# Elasticsearch Monitoring for Google Workspace Integration

Hi, I'm Mohammad Hamarsheh. I've created this directory to contain configuration files and instructions for setting up Elasticsearch monitoring for my Google Workspace Integration application.

## Overview

I've configured the application to log metrics to Elasticsearch, which can be visualized using Kibana. The metrics include:

- API request rates and response times
- Log fetch and forward metrics
- Source additions and removals
- System metrics (memory usage, CPU usage)

## Setup Instructions

### 1. Ensure Elasticsearch and Kibana are running

My Docker Compose configuration already includes Elasticsearch and Kibana. Make sure they are running:

```bash
docker compose ps
```

You should see both `elasticsearch` and `kibana` containers running.

### 2. Access Kibana

Kibana should be available at http://localhost:5601

### 3. Create Index Patterns

1. Go to Stack Management > Index Patterns
2. Create a new index pattern with the pattern `google-workspace-metrics-*`
3. Select `@timestamp` as the time field
4. Click "Create index pattern"

### 4. Import the Dashboard

1. Go to Stack Management > Saved Objects
2. Click "Import"
3. Select the `kibana-dashboard.ndjson` file from this directory
4. Click "Import"

### 5. View the Dashboard

1. Go to Dashboard
2. Open the "Google Workspace Integration Dashboard"

## Available Metrics

I've configured the application to log the following metrics to Elasticsearch:

### API Metrics

- **Path**: The API endpoint path
- **Method**: HTTP method (GET, POST, DELETE)
- **Status Code**: HTTP response status code
- **Response Time**: Time taken to process the request in milliseconds

### Log Fetch Metrics

- **Source ID**: The ID of the source
- **Log Count**: Number of logs fetched
- **Fetch Time**: Time taken to fetch logs in milliseconds
- **Error**: Any error that occurred during fetch

### Log Forward Metrics

- **Source ID**: The ID of the source
- **Log Count**: Number of logs forwarded
- **Forward Time**: Time taken to forward logs in milliseconds
- **Error**: Any error that occurred during forwarding

### Source Metrics

- **Source ID**: The ID of the source
- **Action**: The action performed (add, remove)
- **Active Sources**: Total number of active sources

### System Metrics

- **Memory Usage**: Memory usage in MB
- **CPU Usage**: CPU usage percentage
- **Uptime**: Application uptime in seconds

## Custom Visualizations

You can create custom visualizations in Kibana:

1. Go to Visualize
2. Click "Create visualization"
3. Select the visualization type
4. Select the `google-workspace-metrics-*` index pattern
5. Configure the visualization as needed

## Troubleshooting

### No Data in Kibana

If you don't see any data in Kibana:

1. Check that Elasticsearch is running: `curl http://localhost:9200/_cat/health`
2. Check that the application is logging metrics: `docker logs backend-app-1 | grep elastic`
3. Verify the index exists: `curl http://localhost:9200/_cat/indices/google-workspace-metrics-*`

### Elasticsearch Connection Issues

If the application can't connect to Elasticsearch:

1. Check the Elasticsearch logs: `docker logs backend-elasticsearch-1`
2. Verify the connection settings in the application configuration
3. Ensure the Elasticsearch container is on the same network as the application

## Advanced Configuration

### Retention Policy

By default, Elasticsearch will keep metrics indefinitely. To set up a retention policy:

1. Create an Index Lifecycle Policy in Kibana
2. Apply the policy to the `google-workspace-metrics-*` indices

### Alerting

You can set up alerts in Kibana:

1. Go to Stack Management > Alerting
2. Create a new alert based on metrics thresholds
3. Configure notification channels (email, Slack, etc.) 
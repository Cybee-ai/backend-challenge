# Google Workspace Integration - GCP Deployment Guide

Hello, I'm Mohammad Hamarsheh. In this guide, I'll provide instructions for deploying my Google Workspace Integration application to Google Cloud Platform (GCP).

## Prerequisites

Before you begin, make sure you have:
1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and configured
2. [Docker](https://docs.docker.com/get-docker/) installed
3. A GCP project with billing enabled
4. Required GCP APIs enabled:
   - Cloud Run API
   - Container Registry API
   - Cloud Build API
   - Kubernetes Engine API (if using GKE)
   - Secret Manager API

## Option 1: Deploy to Cloud Run (Serverless)

I've designed the application to work well with Cloud Run, a fully managed platform that automatically scales your stateless containers.

### Step 1: Set up environment

```bash
# Set your GCP project ID
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### Step 2: Create secrets in Secret Manager

```bash
# Create secrets for your application
gcloud secrets create mongo-uri --data-file=- <<< "mongodb://user:password@host:27017/google-workspace-logs"
gcloud secrets create redis-host --data-file=- <<< "your-redis-host"
gcloud secrets create redis-port --data-file=- <<< "6379"
gcloud secrets create redis-password --data-file=- <<< "your-redis-password"
gcloud secrets create elastic-node --data-file=- <<< "http://your-elasticsearch-host:9200"
gcloud secrets create elastic-username --data-file=- <<< "your-elastic-username"
gcloud secrets create elastic-password --data-file=- <<< "your-elastic-password"
gcloud secrets create encryption-key --data-file=- <<< "your-secure-encryption-key"
```

### Step 3: Deploy using Cloud Build

```bash
# Navigate to the backend directory
cd backend

# Submit the build to Cloud Build
gcloud builds submit --config=cloudbuild.yaml .
```

This will:
1. Build the Docker image using my production Dockerfile
2. Push the image to Container Registry
3. Deploy the application to Cloud Run with the specified configuration

### Step 4: Verify deployment

```bash
# Get the URL of your deployed service
gcloud run services describe google-workspace-integration --format="value(status.url)"

# Test the health endpoint
curl <SERVICE_URL>/api/health
```

## Option 2: Deploy to Google Kubernetes Engine (GKE)

For more control and advanced features, I've also prepared configurations for GKE.

### Step 1: Create a GKE cluster

```bash
# Create a GKE cluster
gcloud container clusters create google-workspace-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-standard-2

# Get credentials for the cluster
gcloud container clusters get-credentials google-workspace-cluster --zone us-central1-a
```

### Step 2: Build and push the Docker image

```bash
# Build the Docker image
docker build -f Dockerfile.production -t gcr.io/$PROJECT_ID/google-workspace-integration:latest .

# Push the image to Container Registry
docker push gcr.io/$PROJECT_ID/google-workspace-integration:latest
```

### Step 3: Update Kubernetes manifests

Edit the Kubernetes manifests I've prepared in the `kubernetes` directory:

1. Replace `PROJECT_ID` in `deployment.yaml` with your actual project ID
2. Update `api.your-domain.com` in `ingress.yaml` with your actual domain
3. Update the secrets in `secrets.yaml` with your actual values

### Step 4: Apply Kubernetes manifests

```bash
# Create the namespace
kubectl create namespace google-workspace

# Apply the secrets
kubectl apply -f kubernetes/secrets.yaml -n google-workspace

# Apply the deployment and service
kubectl apply -f kubernetes/deployment.yaml -n google-workspace
kubectl apply -f kubernetes/service.yaml -n google-workspace

# Apply the ingress (if using a domain)
kubectl apply -f kubernetes/ingress.yaml -n google-workspace
```

### Step 5: Verify deployment

```bash
# Check the deployment status
kubectl get deployments -n google-workspace

# Check the pods
kubectl get pods -n google-workspace

# Check the service
kubectl get services -n google-workspace

# Get the external IP (if using LoadBalancer)
kubectl get service google-workspace-integration -n google-workspace
```

## Setting up Monitoring

### Cloud Monitoring and Logging

While I've configured the application to send logs to Elasticsearch, you can also use GCP's native monitoring:

1. Go to the GCP Console
2. Navigate to Operations > Logging
3. Create log-based metrics for important events
4. Set up alerts for critical errors

### Elasticsearch Kibana Dashboard

If you're using the Elasticsearch monitoring I've set up:

1. Access your Kibana instance
2. Create an index pattern for the `google-workspace-metrics-*` indices
3. Create visualizations for:
   - API request rates and response times
   - Log fetch and forward metrics
   - Source additions and removals
   - System metrics

## Continuous Deployment

For continuous deployment, I recommend:

1. Set up a GitHub repository for your code
2. Connect your repository to Cloud Build
3. Create a Cloud Build trigger that:
   - Triggers on pushes to your main branch
   - Uses the `cloudbuild.yaml` configuration I've provided

## Troubleshooting

### Common Issues

1. **Application not starting**: Check the logs in Cloud Run or GKE
2. **Connection issues**: Verify network settings and firewall rules
3. **Authentication failures**: Check secret values and permissions

### Viewing Logs

```bash
# Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=google-workspace-integration" --limit=10

# GKE logs
kubectl logs -l app=google-workspace-integration -n google-workspace
```

## Security Considerations

I've implemented several security best practices, but here are some additional recommendations:

1. Always use Secret Manager or Kubernetes secrets for sensitive information
2. Set up proper IAM roles and permissions
3. Configure network policies to restrict access
4. Enable VPC Service Controls for additional security
5. Regularly update dependencies and container images 
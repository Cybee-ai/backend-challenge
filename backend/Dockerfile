# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies (including dev dependencies for build)
RUN yarn install

# Copy application files
COPY . .

# Build TypeScript code
RUN yarn build

# Expose API port
EXPOSE 3000

# Start the API
CMD ["yarn", "start"]

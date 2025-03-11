# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --production

# Copy application files
COPY . .

# Expose API port
EXPOSE 3000

# Start the API
CMD ["yarn", "start"]

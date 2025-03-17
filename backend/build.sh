#!/bin/bash

# Clean the dist directory
rm -rf dist

# Build TypeScript
npm run build

# Copy package.json and package-lock.json to dist
cp package.json dist/
cp package-lock.json dist/

echo "Build completed successfully!" 
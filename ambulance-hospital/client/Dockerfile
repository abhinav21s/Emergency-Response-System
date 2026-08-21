# Client Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (use lockfile if present)
COPY package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Copy source
COPY . .

# Environment
ENV NODE_ENV=development
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose fixed port
EXPOSE 3000

# Start React dev server bound to 0.0.0.0 (Linux-friendly, bypass Windows-specific npm script)
CMD ["sh", "-c", "PORT=$PORT ./node_modules/.bin/react-scripts start"]

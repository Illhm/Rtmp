FROM node:18-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose RTMP Port
EXPOSE 1935
# Expose HTTP-FLV Port
EXPOSE 8000
# Expose HTTP API Port
EXPOSE 3000

# Start server
CMD ["node", "src/server.js"]

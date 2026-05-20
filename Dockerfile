FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package*.json ./
RUN npm install

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

# Install production deps
COPY package*.json ./
RUN npm install --omit=dev

# Copy built frontend
COPY --from=build /app/public/frontend ./public/frontend

# Copy all backend source files
COPY app.js ./app.js
COPY db ./db
COPY middleware ./middleware
COPY models ./models
COPY scripts ./scripts
COPY services ./services
COPY utils ./utils
COPY views ./views

# Copy env example as reference (actual .env injected via docker-compose env_file)
COPY .env.example ./.env.example

# Ensure upload and frontend dirs exist
RUN mkdir -p /app/public/uploads /app/public/frontend

EXPOSE 8787
CMD ["node", "app.js"]

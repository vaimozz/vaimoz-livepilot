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
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/public/frontend ./public/frontend
COPY app.js ./app.js
COPY db ./db
COPY middleware ./middleware
COPY models ./models
COPY services ./services
COPY utils ./utils
COPY views ./views
COPY public/uploads ./public/uploads
COPY .env.example ./.env.example
RUN mkdir -p /app/public/uploads /app/public/frontend
EXPOSE 8787
CMD ["node", "app.js"]

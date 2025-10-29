# Cto-1 Data Platform Schema

This repository defines the core data model for the Cto-1 coaching experience. It uses Prisma with PostgreSQL and the `pgvector` extension to support embeddings alongside traditional relational data.

## Prerequisites

- Node.js \>= 18.18
- [pnpm](https://pnpm.io/) 9 or newer
- PostgreSQL 15+ with the ability to enable the `pgvector` and `pgcrypto` extensions (the provided migration does this automatically)

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Copy the environment template and adjust the connection string for your local database:
   ```bash
   cp .env.example .env
   ```
3. Generate the Prisma client:
   ```bash
   pnpm prisma:generate
   ```
4. Apply the schema and enable the required extensions:
   ```bash
   pnpm prisma:migrate
   ```
5. Seed the database with demo data that exercises all relations and creates vector embeddings:
   ```bash
   pnpm prisma:seed
   ```

## Verifying the Prisma Client

After seeding you can run a sample query that loads the demo user, recent activity, and generated reports:

```bash
pnpm exec tsx src/api/demo-user.ts
```

The script uses the shared Prisma client helper and prints the seeded dashboard data to the console.

## Background Worker

The BullMQ worker connects to Redis and processes reminder and report queues.

```bash
pnpm worker
```

Set `REDIS_URL` in your environment or `.env` file. A `docker-compose.yml` file is provided to run PostgreSQL, Redis, and the worker service locally:

```bash
docker compose up worker
```

## Schema Overview

A high-level description of every model, enum, and relation is documented in [`ARCHITECTURE.md`](./ARCHITECTURE.md). Use it as a reference when evolving the domain.

## Next Steps

- Integrate the generated Prisma client anywhere in your application with:
  ```ts
  import { prisma } from './src/lib/prisma';
  ```
- Extend the seed data as you introduce new product features so automated environments stay representative.

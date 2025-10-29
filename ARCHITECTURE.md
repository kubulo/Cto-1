# Data Architecture Overview

This document summarizes the Prisma data model that powers the Cto-1 coaching platform. The schema combines relational entities with vector embeddings to support AI-assisted insights.

## Conventions

- All primary keys use UUIDs generated in the database via `gen_random_uuid()`.
- Timestamp columns use millisecond precision. `createdAt` defaults to `now()` and `updatedAt` columns leverage Prisma's `@updatedAt` behaviour.
- The `pgvector` extension stores dense embeddings alongside relational data for semantic search and retrieval-augmented generation workflows.

## Enums

| Enum | Description |
| --- | --- |
| `ReportType` | Enumerates reporting windows: two-, seven-, and twenty-one-day summaries. |
| `EmotionValence` | Qualitative sentiment capture for tracked emotions (`POSITIVE`, `NEUTRAL`, `NEGATIVE`). |
| `ReminderStatus` | Lifecycle state for scheduled commitments and goals (`PENDING`, `SCHEDULED`, `COMPLETED`, `SKIPPED`). |
| `MessageRole` | Chat roles for stored conversation messages (`USER`, `ASSISTANT`, `SYSTEM`). |

## Core Entities

### User
Represents a coaching participant. Users can own sessions, conversations, insights, goals, commitments, emotions, metrics, and reports. `email` is unique; `lastSeenAt` supports presence tracking.

### Session
Authentication session with expiry and unique token per user. Configured to cascade delete with the parent user.

### Conversation
Threaded interactions between the user and assistant. Stores a `summary` for quick previews. Deleting a user removes associated conversations and messages.

### Message
Individual entries inside a conversation. Messages may have an author (`userId`) when the message originates from the user. Assistant messages omit `userId`. Metadata JSON captures delivery details. An optional `Embedding` row links semantic vectors for retrieval.

### Insight
Actionable observations derived from conversations or analytics. Insights belong to a user, may relate to a conversation, and can reference an embedding for similarity search. `tags` classify insights for filtering.

### Goal
Longer-term objectives defined by the user. Goals track progress, target dates, and status using `ReminderStatus`. They aggregate related commitments.

### Commitment
Concrete tasks or reminders aligned to a goal. They inherit `ReminderStatus` to capture scheduling and completion, and include optional due and completion timestamps.

### Emotion
Captures mood snapshots associated with a user (and optionally a conversation) using qualitative valence and quantitative intensity.

### EnergyMetric
Quantitative energy tracking entries with optional notes. Useful for correlating habits with wellbeing.

### ConsistencyMetric
Derived analytics summarizing habit adherence over a multi-day rolling window. Uses a decimal score (`0-100`) and stores contextual notes.

### Report
Aggregated analytics for a user over a defined period. Stores structured JSON payloads for dashboards and can reference an embedding for semantic recall of report summaries.

### Embedding
Holds pgvector embeddings generated for conversational content, insights, or reports. Each row links to at most one resource via nullable foreign keys (`messageId`, `insightId`, `reportId`). The `dimension` column records vector length for validation.

## Relational Diagram Summary

```
User ──< Session
User ──< Conversation ──< Message ──? Embedding
User ──< Insight ──? Embedding
User ──< Goal ──< Commitment
User ──< Emotion
User ──< EnergyMetric
User ──< ConsistencyMetric
User ──< Report ──? Embedding
```

Arrows indicate one-to-many relationships; dotted `?` connections highlight optional one-to-one links via the `Embedding` table.

## Seeding Strategy

`prisma/seed.ts` resets the demo user record, then populates:

- Sessions, conversations, and bi-directional messages.
- Insights, goals, commitments, and behavioural metrics.
- Reports summarizing weekly activity with rich JSON payloads.
- Three embeddings (assistant message, insight, report) inserted via raw SQL to populate the `vector` column.

This provides a representative dataset for local development, dashboards, and playground queries.

## Usage Notes

- Run `pnpm prisma:generate` after modifying the schema to refresh the Prisma client.
- Embedding inserts currently use `INSERT ... ::vector` statements; adapt the helper in `prisma/seed.ts` if you introduce custom dimensions or vector providers.
- The shared Prisma client instance lives in `src/lib/prisma.ts` to avoid hot-reload connection churn.

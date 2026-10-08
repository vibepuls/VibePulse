# VibePulse Point Wars

This upgrade integrates Point Wars into the existing VibePulse React/Vite + Express + PostgreSQL + Socket.IO application.

## Production data flow
- PostgreSQL is the source of truth for points, post points, inventory, shop purchases, quests, spin claims and duels.
- Express endpoints under `/api/point-wars` validate economy operations server-side.
- Point transactions are written to `point_transactions`.
- New eligible posts receive 50 Point Wars points in `post_game_stats`.
- Socket.IO emits live `steal_completed`, `gift_received`, and `duel_finished` events.

## Migration
Run the normal VibePulse migration command:

```bash
npm run migrate:up
```

The migration runner now executes all SQL migrations in sorted order, including `003_point_wars.sql`.

## UI
The existing VibePulse sidebar now includes **Point Wars**, available at `/point-wars`.

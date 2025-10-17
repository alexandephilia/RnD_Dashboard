---
inclusion: always
---

# Tech Stack

## Framework & Runtime

- **Next.js 15** with App Router (server components by default)
- **React 19** with TypeScript 5
- **Node.js** (ES2017 target)

## Build System

- **Turbopack** for dev and build (via `--turbopack` flag)
- **TypeScript** with strict mode enabled
- Path aliases: `@/*` maps to `./src/*`

## Styling

- **Tailwind CSS v4** with PostCSS
- **JetBrains Mono** font (monospace)
- Dark mode only (`scheme-only-dark`)
- Custom CSS variables for theming

## UI Libraries

- **shadcn/ui** components built on Radix UI primitives
- **TanStack Table v8** for data tables
- **Lucide React** and **Remix Icon** for icons
- **class-variance-authority** + **clsx** + **tailwind-merge** for className utilities

## Database

- **MongoDB** with native driver (not Mongoose)
- Connection pooling (maxPoolSize: 5)
- Environment variables: `MONGO_PUBLIC_URL`, `MONGO_URL`, or `MONGODB_URI`
- Collections: tokens, users, groupmonthlytokens

## Visual Effects

- **Three.js** with postprocessing for 3D effects
- Custom PixelBlast component for login screen

## Common Commands

```bash
# Development (with Turbopack)
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint
```

## Environment Variables

- `MONGO_PUBLIC_URL` / `MONGO_URL` / `MONGODB_URI` - MongoDB connection
- `MONGO_DB_NAME` - Database name (default: "test")
- `MONGO_COLLECTION_TOKEN_CALLS` - Token calls collection (default: "tokens")
- `MONGO_COLLECTION_USERS` - Users collection (default: "users")
- `MONGO_COLLECTION_GROUP_MONTHLY_TOKENS` - Group monthly tokens (default: "groupmonthlytokens")
- `BOT_API_URL` - External API fallback endpoint
- `BOT_API_TOKEN` - Optional bearer token for external API

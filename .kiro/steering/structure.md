---
inclusion: always
---

# Project Structure

## Directory Organization

```
src/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   └── rnd/            # Main API endpoints (stats, users, token-calls, etc.)
│   ├── dashboard/          # Protected dashboard page
│   ├── login/              # Login page
│   ├── logout/             # Logout handler
│   ├── layout.tsx          # Root layout (dark mode, font)
│   ├── page.tsx            # Home page (redirects to dashboard)
│   └── globals.css         # Global styles
├── components/              # React components
│   ├── ui/                 # shadcn/ui primitives (button, card, table, etc.)
│   ├── effects/            # Visual effects (PixelBlast)
│   ├── data-table.tsx      # Reusable table with TanStack Table
│   ├── db-lists.tsx        # Dashboard data lists
│   ├── stats-live.tsx      # Live statistics component
│   ├── system-status.tsx   # System health monitoring
│   └── app-sidebar.tsx     # Navigation sidebar
├── lib/                     # Utilities
│   ├── utils.ts            # cn() helper for className merging
│   └── config.ts           # Bot API configuration
├── server/                  # Server-side code
│   └── db/
│       └── mongo.ts        # MongoDB client and helpers
├── types/                   # TypeScript declarations
│   ├── jsx.d.ts
│   └── three.d.ts
├── hooks/                   # React hooks
│   └── use-mobile.ts
└── middleware.ts            # Auth middleware (cookie-based)

public/
└── data/                    # Static JSON fallback data
    ├── token-calls.json
    ├── users.json
    └── users-bot.json
```

## Key Conventions

### Component Patterns

- **Server components by default** - use `"use client"` directive only when needed
- **Client components** require interactivity (useState, useEffect, event handlers)
- **API routes** use `export const dynamic = "force-dynamic"` to prevent caching

### File Naming

- Components: kebab-case (e.g., `data-table.tsx`, `app-sidebar.tsx`)
- API routes: `route.ts` in folder structure matching URL path
- UI primitives: kebab-case in `components/ui/`

### Styling

- Use `cn()` utility from `@/lib/utils` for conditional className merging
- Tailwind utilities preferred over custom CSS
- CSS variables for theming (e.g., `var(--color-card)`)

### Data Flow

- **MongoDB first**: Try MongoDB queries, fall back to external API on error
- **No caching**: API routes use `Cache-Control: no-store` headers
- **Type safety**: TypeScript strict mode, no implicit any

### Authentication

- Cookie-based: `session=1` cookie required for protected routes
- Middleware protects `/` and `/dashboard/*` paths
- Public paths: `/login`, `/logout`, `/api/*`, `/_next/*`, `/public/*`

### Database Queries

- Use native MongoDB driver (not Mongoose)
- Filter test tokens: exclude `token` or `token_address` starting with `test_`
- Date fields vary: check `updatedAt`, `last_updated`, `createdAt`, `first_poster.posted_at`
- Always use connection pooling via `getMongoClient()`

# Admin Dashboard

A Next.js 15 App Router admin dashboard featuring TypeScript, React 19, Tailwind CSS 4, and shadcn/Radix UI primitives. This project includes cookie-based authentication, server-rendered data aggregation with MongoDB, and interactive client components with real-time updates.

## Features

- **Authentication**: Cookie-based auth (session/admin_name cookies) via `/api/auth/login` enforced by middleware
- **Dashboard**: Server-rendered `/dashboard` aggregating bot telemetry with MongoDB queries, external API proxies, and local JSON fallbacks
- **API Routes**: Comprehensive endpoints under `/api/rnd` providing:
  - Mongo-backed or proxied stats
  - Token/user listings with pagination
  - Group monthly aggregates
  - SSE token stream for real-time updates
  - Diagnostics for Mongo and upstream endpoints
- **Client Components**: 
  - `StatsLive`: Real-time statistics visualization
  - `DbLists`: Interactive data tables with fade-out scroll indicators
  - `SystemStatus`: System health monitoring
  - CSV/JSON export capabilities
- **Visual Effects**: PixelBlast effects on login screen for enhanced visual experience

## UI Enhancements

### Table Scroll Fade Effects

The dashboard tables feature **smooth, gradual fade-out effects** on the edges when content overflows horizontally. This provides a professional visual indicator that more content is available by scrolling.

**Key features:**
- **Intelligent edge detection**: Fades only appear when content actually overflows
- **Dynamic positioning**: 
  - Left fade appears when scrolled right (indicating more content to the left)
  - Right fade appears when scrolled left (indicating more content to the right)
  - No fade at scroll boundaries (proper edge case handling)
- **Smooth transitions**: 300ms fade-in/out animations for seamless UX
- **Performance optimized**: 
  - Uses `requestAnimationFrame` for smooth scroll tracking
  - ResizeObserver for responsive behavior
  - Passive event listeners for better scrolling performance

The implementation works across all dashboard tables, including Token Calls, Users, and Group Monthly data views.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Setup

Ensure you have the following environment variables configured:
- MongoDB connection string (if using database features)
- External API endpoints (if using proxied data)

## Project Structure

```
src/
├── app/                    # Next.js 15 App Router pages
│   ├── dashboard/         # Main dashboard page
│   ├── login/             # Authentication page
│   └── api/               # API routes
├── components/            # React components
│   ├── data-table.tsx    # Reusable table with scroll fades
│   ├── db-lists.tsx      # Dashboard data lists
│   ├── stats-live.tsx    # Live statistics
│   └── system-status.tsx # System health monitoring
└── lib/                   # Utility functions
```

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [React 19 Documentation](https://react.dev) - explore React's latest features
- [Tailwind CSS v4](https://tailwindcss.com) - utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com) - re-usable component library
- [TanStack Table](https://tanstack.com/table) - powerful table library

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Dashboard Sidebar Architecture

## Overview

The dashboard uses a sophisticated multi-layer sidebar system with distinct behaviors for desktop and mobile screens.

---

## Component Hierarchy

```
SidebarProvider (context + state management)
├── AppSidebar (main sidebar content)
├── FloatingSidebarProvider (hover-triggered floating sidebar)
│   ├── SidebarHoverTrigger (floating sidebar on desktop)
│   └── SidebarTriggerSmart (intelligent toggle button)
└── SidebarInset (main content area)
```

---

## Mobile Detection

**File:** `src/hooks/use-mobile.ts`

```typescript
const MOBILE_BREAKPOINT = 1024; // px
```

- Uses `window.matchMedia` to detect viewport width
- Screens < 1024px are considered "mobile"
- Returns `boolean` via `useIsMobile()` hook

---

## Desktop vs Mobile Behavior

### Desktop (≥1024px)

| Feature | Behavior |
|---------|----------|
| **Main Sidebar** | Fixed position, collapsible via toggle or keyboard (`Cmd/Ctrl + B`) |
| **Floating Sidebar** | Appears on hover near left edge (15px trigger zone) |
| **Collapse Mode** | Uses `offcanvas` - slides completely off-screen |
| **Rail** | Visible for drag-to-toggle interaction |

**Floating Sidebar Flow:**
1. Mouse enters 15px left edge zone → floating sidebar slides in
2. Mouse leaves → 4-second auto-dismiss countdown
3. Click toggle while floating visible → transforms into main sidebar (smooth animation)

### Mobile (<1024px)

| Feature | Behavior |
|---------|----------|
| **Main Sidebar** | Hidden by default |
| **Trigger** | Hamburger menu icon, opens Sheet (overlay drawer) |
| **Sheet** | Full-height slide-in from left with backdrop |
| **Floating Sidebar** | Completely disabled (not rendered) |

**Mobile Sheet Properties:**
- Width: `18rem` (vs `16rem` on desktop)
- Full viewport height
- Dark backdrop overlay (`bg-black/80`)
- Close button (X) in top-right corner
- Hamburger menu icon in header to open

---

## Key State Variables

```typescript
// From SidebarContext
{
  state: "expanded" | "collapsed",  // Desktop sidebar state
  open: boolean,                     // Desktop sidebar open
  openMobile: boolean,               // Mobile sheet open
  isMobile: boolean,                 // Viewport detection
  toggleSidebar: () => void,         // Toggles appropriate sidebar
}

// From FloatingSidebarContext
{
  isFloatingVisible: boolean,        // Floating sidebar shown
  isTransforming: boolean,           // Animation in progress
  triggerTransformation: () => void, // Convert floating → main
}
```

---

## How to Distinguish Mobile State

### In Components

```tsx
import { useSidebar } from "@/components/ui/sidebar";

function MyComponent() {
  const { isMobile, openMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    // Mobile-specific logic
    return <MobileView />;
  }

  return <DesktopView />;
}
```

### In CSS/Tailwind

```tsx
// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="md:hidden">Mobile only</div>

// Responsive sidebar width
<div className="w-full md:w-[var(--sidebar-width)]">
```

### Via Data Attributes

```tsx
// The Sidebar component sets these attributes
<div
  data-state="expanded|collapsed"
  data-mobile="true"  // Only on mobile Sheet
  data-sidebar="sidebar"
>
```

---

## File Reference

| File | Purpose |
|------|---------|
| `src/components/ui/sidebar.tsx` | Base sidebar primitives, context, mobile Sheet logic |
| `src/components/app-sidebar.tsx` | Main sidebar content (nav items, branding) |
| `src/components/sidebar-hover-trigger.tsx` | Floating sidebar + transformation animations |
| `src/components/sidebar-trigger-smart.tsx` | Smart toggle that handles floating → main conversion |
| `src/components/ui/sheet.tsx` | Mobile drawer overlay component |
| `src/hooks/use-mobile.ts` | Viewport detection hook |

---

## CSS Variables

```css
--sidebar-width: 16rem;        /* Desktop width */
--sidebar-width-icon: 3rem;    /* Collapsed icon-only width */
--sidebar-width-mobile: 18rem; /* Mobile sheet width */
```

---

## Animation States

### Floating Sidebar
- `floating-sidebar-slide-in`: Entry animation (0.3s ease-out)
- `floating-sidebar-slide-out`: Exit animation (0.3s ease-in)
- `hover-sidebar-transforming`: Transformation to main sidebar (350ms)

### Mobile Sheet
- `slide-in-from-left`: Entry (500ms)
- `slide-out-to-left`: Exit (300ms)
- Backdrop fade in/out

---

## Quick Reference: Conditional Rendering

```tsx
// Pattern 1: Hook-based
const { isMobile } = useSidebar();
if (isMobile) return <MobileComponent />;

// Pattern 2: CSS-based (preferred for simple show/hide)
<div className="hidden md:flex">Desktop</div>
<div className="flex md:hidden">Mobile</div>

// Pattern 3: Floating sidebar awareness
const { isFloatingVisible } = useFloatingSidebar();
// Note: Floating sidebar is NEVER visible on mobile
```

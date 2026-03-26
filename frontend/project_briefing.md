# 🛸 Dark Vessels — Project Documentation

**Team Gamma** | Maritime Intelligence Platform

---

## 📌 What Is This Project?

**Dark Vessels** is a web-based maritime monitoring dashboard that detects and flags ships that have deliberately disabled their AIS (Automatic Identification System) transponders — making themselves "invisible" to digital tracking. These so-called **dark vessels** often go silent to conceal illegal activities including unauthorized fishing, smuggling, or evading international sanctions.

The platform cross-references **satellite radar imagery** (which physically detects ships by their metallic hull) against **live AIS broadcast data** (what ships voluntarily report), surfacing discrepancies that indicate suspicious or illegal behavior.

> **Core Mission**: Watch over European waters and unmask vessels that are physically present but digitally silent.

---

## 🔍 The Problem

The global ocean tracking system relies on a "handshake" protocol: ships broadcast their GPS position, name, and flag via AIS. When a captain deliberately disables this transponder, they create a **data blind spot** — a zone where:

- Environmental laws effectively stop being enforced
- Labor inspections cannot be triggered
- Illegal fishing, smuggling, and sanctions evasion can occur undetected
- Oil spill accountability becomes nearly impossible

---

## 🗂 Data Sources

| Source                              | Type                    | What It Provides                                                      |
| ----------------------------------- | ----------------------- | --------------------------------------------------------------------- |
| **AIS Hub API**                     | Real-time API           | GPS position, vessel name, flag — ships that _are_ broadcasting       |
| **Sentinel-1 SAR (Copernicus Hub)** | Satellite radar imagery | Physical detection of metallic hulls regardless of AIS status         |
| **EMSA Port Data**                  | EU agency database      | Verifies if a silent vessel was recently cleared from a European port |

---

## 🏗 Tech Stack

| Layer        | Technology      |
| ------------ | --------------- |
| **Frontend** | React.js (Vite) |
| **Backend**  | Go              |
| **Database** | PostgreSQL      |
| **Hosting**  | Firebase        |

---

## ✅ MVP Features (Build First)

These are the core features that define the product and must ship in v1.

### 1. Interactive Maritime Map

- Full-screen map (Leaflet.js or Mapbox GL) centered on EU waters
- Real-time overlay of AIS-broadcasting vessels as dots/icons
- Satellite radar layer toggle showing Sentinel-1 SAR detections
- Color coding: **Green** = broadcasting, **Red** = dark vessel detected, **Yellow** = unverified/suspicious

### 2. Dark Vessel Detection Engine

- Backend cross-references SAR detections with AIS data by geographic proximity and timestamp
- Ships detected by radar but absent from AIS feed are flagged as **"potential dark vessels"**
- Confidence score per flagged vessel based on spatial match quality

### 3. Vessel Detail Panel

- Click on any flagged vessel to open a side panel
- Shows: last known AIS broadcast, SAR detection timestamp, EMSA port clearance status, estimated vessel size

### 4. Alert / Incident Feed

- Chronological list of new dark vessel detections
- Filterable by region (Mediterranean, Baltic, North Sea, etc.), severity, and date range
- Each alert links to the map location

### 5. Basic Authentication

- Login / signup for authorized users (maritime authorities, researchers)
- Role-based access: admin vs. read-only analyst

### 6. Historical Lookup

- Search by area + time range to see which vessels were in a zone (even those that were dark)
- Critical for post-incident analysis (e.g., oil spills — "who was here 6 hours ago?")

---

## 🚀 Post-MVP / Future Features

Features to add after the MVP is validated.

### Impossible Travel Detection

- Algorithm flags vessels whose AIS position is geographically impossible given their last known location and elapsed time
- Example: AIS says the ship is in the Mediterranean, but SAR detects it in the Baltic — flags as **"AIS spoofing"**

### Automated Reporting

- One-click PDF/CSV report generation for regulatory submission to EMSA or national coast guards
- Report includes vessel ID, detection timeline, satellite imagery snapshots, confidence score

### Pattern Recognition / ML Layer

- Train a model on historical dark vessel incidents to predict likely disappearance zones
- Flag vessels showing pre-disappearance behavioral patterns (speed changes, direction anomalies)

### Multi-satellite Integration

- Add Planet Labs, ICEYE, or Capella Space for higher temporal resolution
- Reduce the detection gap from hours to minutes

### Collaboration Tools

- Annotate incidents with notes, share with team members
- Assign follow-up tasks to analysts
- Case management workflow for ongoing investigations

### Vessel Risk Scoring

- Aggregate a risk profile per vessel based on: frequency of AIS gaps, routes through high-risk zones, flag state, historical violations
- Persistent vessel "watchlist"

### Mobile / PWA Version

- Responsive dashboard for field officers with offline map caching
- Push notifications for new alerts in assigned regions

### Public Transparency Layer

- Read-only public-facing version showing anonymized aggregated dark vessel statistics per region
- Increases accountability and public pressure on enforcement agencies

---

## 🖥 Frontend Architecture (Vite + React)

### Project Structure

```
dark-vessels-frontend/
├── public/
│   └── assets/
├── src/
│   ├── api/               # All API calls (AIS, SAR, EMSA, backend)
│   │   ├── aisService.ts
│   │   ├── sarService.ts
│   │   └── vesselService.ts
│   ├── components/        # Reusable UI components
│   │   ├── common/        # Button, Badge, Modal, Spinner, etc.
│   │   ├── map/           # MapContainer, VesselMarker, LayerToggle
│   │   ├── vessel/        # VesselCard, VesselPanel, VesselTimeline
│   │   └── alerts/        # AlertFeed, AlertItem, AlertFilters
│   ├── features/          # Feature-based slices (if using Redux Toolkit)
│   │   ├── vessels/
│   │   ├── alerts/
│   │   └── auth/
│   ├── hooks/             # Custom hooks
│   │   ├── useMap.ts
│   │   ├── useVessels.ts
│   │   └── useAlerts.ts
│   ├── layouts/           # Shell / page wrappers
│   │   ├── AppLayout.tsx
│   │   └── AuthLayout.tsx
│   ├── pages/             # Route-level page components
│   │   ├── DashboardPage.tsx
│   │   ├── MapPage.tsx
│   │   ├── AlertsPage.tsx
│   │   ├── VesselDetailPage.tsx
│   │   ├── HistoryPage.tsx
│   │   └── LoginPage.tsx
│   ├── router/            # React Router v6 config
│   │   └── index.tsx
│   ├── store/             # Zustand or Redux store
│   ├── styles/            # Global CSS / design tokens
│   │   ├── tokens.css     # Color, spacing, typography variables
│   │   └── globals.css
│   ├── types/             # TypeScript interfaces
│   │   ├── vessel.ts
│   │   ├── alert.ts
│   │   └── user.ts
│   ├── utils/             # Pure functions (formatters, geo helpers)
│   └── main.tsx
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Key Libraries

| Purpose          | Library                                 |
| ---------------- | --------------------------------------- |
| Routing          | React Router v6                         |
| State Management | Zustand (lightweight) or Redux Toolkit  |
| Map              | Mapbox GL JS or Leaflet + react-leaflet |
| Data Fetching    | TanStack Query (React Query)            |
| Forms            | React Hook Form + Zod                   |
| UI Components    | Shadcn/ui or Radix UI primitives        |
| Charts/Stats     | Recharts                                |
| Styling          | Tailwind CSS                            |
| Icons            | Lucide React                            |
| Date/Time        | date-fns                                |

### Vite Config Highlights

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": "/src" }, // Clean imports: @/components/...
  },
  server: {
    proxy: {
      "/api": "http://localhost:8080", // Proxy to Go backend
    },
  },
});
```

---

## 📄 Main Pages

### 1. `/login` — Login Page

- Minimal auth screen
- Email + password, or OAuth (Google)
- No sidebar; centered card layout

### 2. `/` — Dashboard (Home)

- KPI cards: Active dark vessel detections today, High-severity alerts, Coverage area (km²), Data freshness timestamp
- Mini-map preview with latest flagged vessels
- Recent alerts feed (last 10)
- Quick-access buttons to full Map and Alerts views

### 3. `/map` — Interactive Map (Core Feature)

- Full-screen map, minimal chrome
- Left sidebar: filter controls (date, region, vessel type, severity)
- Right panel (slide-in): vessel detail when a marker is clicked
- Top bar: layer toggles (AIS only, SAR only, Combined/Dark vessels)
- Real-time updates via WebSocket or polling

### 4. `/alerts` — Alert Feed

- Table/card list of all flagged incidents
- Columns: timestamp, region, confidence %, vessel size estimate, status (new / under review / resolved)
- Click to jump to map location or open detail modal
- Export button (CSV)

### 5. `/vessel/:id` — Vessel Detail Page

- Timeline of AIS broadcasts for this vessel
- Satellite detection overlaid on timeline
- Port clearance history from EMSA
- Map showing vessel track
- Risk score badge

### 6. `/history` — Historical Search

- Date range picker + bounding box map selection
- Search: "show me all vessels in this area during this time window"
- Results include dark vessels that were detected but silent
- Useful for post-incident investigation

### 7. `/settings` — User Settings (post-MVP)

- Notification preferences
- Watchlisted regions or specific vessels
- API key management for power users

---

## 🎨 UI/UX Design Guidelines

### Design Philosophy

The product is a **serious operational tool** used by maritime authorities, researchers, and enforcement agencies. The aesthetic should be **dark, precise, and data-dense** — inspired by defense and intelligence dashboards, not consumer apps. Think: mission control, not Instagram.

### Color Palette

```css
/* Design Tokens — tokens.css */
:root {
  /* Background */
  --bg-primary: #0a0e1a; /* Deep navy — main background */
  --bg-secondary: #111827; /* Slightly lighter panel bg */
  --bg-surface: #1c2333; /* Cards, drawers */
  --bg-border: #2d3748; /* Subtle borders */

  /* Text */
  --text-primary: #e2e8f0; /* Main readable text */
  --text-muted: #718096; /* Labels, metadata */

  /* Status / Alert Colors */
  --status-safe: #22c55e; /* AIS broadcasting — green */
  --status-alert: #ef4444; /* Dark vessel — red */
  --status-warning: #f59e0b; /* Suspicious / unverified — amber */
  --status-info: #3b82f6; /* Neutral info — blue */

  /* Accent */
  --accent: #06b6d4; /* Cyan — interactive elements, highlights */
  --accent-dim: rgba(6, 182, 212, 0.15);

  /* Spacing scale */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 40px;
}
```

### Typography

- **Display / Headings**: `Space Mono` or `JetBrains Mono` — reinforces the technical, data-centric character
- **Body / UI text**: `IBM Plex Sans` — clean, readable, authority feel
- **Data / Numbers**: Monospace font for coordinates, timestamps, IDs (aligns columns, feels precise)

### Component Patterns

**Vessel Status Badge**

```
● BROADCASTING    — green pill
● DARK VESSEL     — red pill, subtle pulse animation
● UNVERIFIED      — amber pill
```

**Map Markers**

- Broadcasting vessels: small cyan dot
- Dark/flagged vessels: red pulsing ring (CSS animation)
- Cluster markers when zoomed out, expand on zoom

**Alert Severity Levels**

- 🔴 Critical — confirmed dark vessel, high confidence
- 🟡 Warning — suspicious AIS gap, awaiting SAR confirmation
- 🔵 Info — vessel re-appeared / situation resolved

**Side Panels**

- Slide in from the right, never replace the map
- Dismissible with ESC or click outside
- Semi-transparent dark glass effect (`backdrop-filter: blur`)

### Layout Principles

- **Map is always king**: the map should never be fully hidden on the main view
- **Dark backgrounds**: reduce eye strain for operators monitoring for hours
- **Information density**: lean toward more data per screen, not less — but with clear visual hierarchy
- **Progressive disclosure**: show summary first, details on click/expand
- **Accessibility**: ensure color-coded status elements also have text labels (don't rely on color alone)

### Responsive Strategy

- **Primary target**: desktop / large monitor (1280px+) — operational use
- **Secondary**: tablet landscape (for field use)
- **Mobile**: simplified read-only alert view; full map on mobile is deprioritized for MVP

---

## 🔌 API Integration Pattern

```ts
// Example: useVessels hook with React Query
const { data: darkVessels, isLoading } = useQuery({
  queryKey: ["vessels", "dark", filters],
  queryFn: () => vesselService.getDarkVessels(filters),
  refetchInterval: 30_000, // Poll every 30 seconds
  staleTime: 20_000,
});
```

- All API calls go through `/src/api/` service files
- React Query handles caching, background refetching, loading/error states
- WebSocket connection for real-time alert pushes (new detections)
- Optimistic UI updates for status changes

---

## 🔐 Auth Flow

1. User visits `/login`
2. Submit credentials → Go backend validates → returns JWT
3. JWT stored in `httpOnly` cookie (not localStorage — security)
4. React Router protected routes check auth state via Zustand store
5. Refresh token flow handled transparently by Axios interceptor

---

## 📋 Development Roadmap

### Phase 1 — MVP (Weeks 1–6)

- [ ] Project scaffolding (Vite + React + TypeScript + Tailwind)
- [ ] Auth pages + JWT integration with Go backend
- [ ] Interactive map with AIS data overlay
- [ ] SAR data layer integration (Copernicus)
- [ ] Basic dark vessel detection logic (backend)
- [ ] Vessel detail panel
- [ ] Alert feed page
- [ ] Deploy to Firebase Hosting

### Phase 2 — Hardening (Weeks 7–10)

- [ ] Historical search page
- [ ] Impossible travel detection algorithm
- [ ] Export to CSV/PDF
- [ ] Performance optimization (map clustering, pagination)
- [ ] Error states + loading skeletons throughout

### Phase 3 — Growth (Weeks 11+)

- [ ] ML-based pattern recognition
- [ ] Vessel risk scoring
- [ ] Collaboration / case management features
- [ ] Public transparency dashboard
- [ ] Mobile PWA

---

_Last updated: March 2026 — Team Gamma_

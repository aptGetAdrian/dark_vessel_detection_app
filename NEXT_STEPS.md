# Next Steps — Dark Vessels (Heimdal)

Prioritised improvements for the class presentation. Focus: visual impact, interactivity, and "wow factor."

---

## 1. High-Impact Visual Features (Presentation Must-Haves)

### 1.1 Animated Vessel Trails (Ghost Wake)
Currently the track is a static dashed line. Replace with an animated gradient trail that fades from bright to transparent — like a "wake" behind the vessel. Shows where the dark vessel has been sneaking through.

### 1.2 Pulse Animation on Dark Vessels
Add a red pulsing ring animation (like sonar ping) around dark vessels on the map. Makes them immediately visible and dramatic. You already have the `pulse-ring` keyframe in CSS — wire it to dark vessel markers.

### 1.3 Live Counter Animations on Dashboard
The `useCountUp` hook exists but could be enhanced with a "slot machine" style rolling digits when stats change. Gives the impression that the system is alive and processing data in real-time.

### 1.4 Scan Area Boundary Visualization
Draw the 16 EU scan area polygons on the map as subtle glowing rectangles (dashed borders, translucent fill). When a satellite scan happens, briefly flash/pulse that area. Shows the audience the geographic coverage.

### 1.5 "Investigation Mode" — Click a Dark Vessel → Full Story
Currently the modal shows data rows. Add a timeline view: "Last seen at Port X → AIS lost → Satellite detected here → 14h gap." Visual storytelling that explains why this is suspicious. Could be a simple vertical timeline with icons.

---

## 2. Medium-Impact Features (Nice to Have)

### 2.1 Dark/Light Mode Toggle
The dark theme is already well-designed. Add a toggle (or at minimum a one-click demo) to show that the design system supports theming. Quick win using existing CSS tokens.

### 2.2 Search & Filter Bar
The search icon in the header does nothing. Wire it up: search vessels by name, MMSI, or flag. During the presentation, type "FORTUNE" and watch the map fly to that vessel.

### 2.3 Notification Toast for New Alerts
When a new alert fires (on poll), slide in a toast notification from the bottom-right. "New alert: HONG CHANG 68 — AIS silent for 18h." Makes the live demo feel alive even when the audience isn't interacting.

### 2.4 Connection Status Indicator
The "Updated X ago" strip is subtle. Add a small live-data indicator in the header: green dot + "Connected to AIS stream" or red dot + "Simulated data." Tells the audience what's real vs mock.

### 2.5 Cluster Markers for Zoomed-Out View
When zoomed out to all of Europe, hundreds of vessel markers overlap. Use Mapbox clustering (supercluster) to show "42 vessels" bubbles that expand on zoom. Cleaner, more professional look.

---

## 3. Code Cleanup & Reliability

### 3.1 Remove Unused Worktree
There's a `.claude/worktrees/funny-lalande/` directory with an older version of the code. Clean it up.

### 3.2 Consistent File Naming
Some hooks use different conventions (`Usedashboardcards.tsx` in the worktree vs `useDashboardCards.ts` in main). Already fixed in main, but good to verify after cleanup.

### 3.3 Error Boundary
Add a React error boundary so a crash in one component doesn't white-screen the whole app mid-presentation. Show a graceful "Something went wrong" panel instead.

### 3.4 Loading Skeleton Screens
Replace the single "Loading statistics..." text with skeleton shimmer cards that match the actual layout. Looks more polished during slow network demos.

---

## 4. Demo Preparation

### 4.1 Seed Script for Impressive Demo Data
There's a `cmd/seed/main.go` — make sure it creates a compelling scenario: a few vessels with suspicious patterns, one "caught" dark vessel that was detected by satellite, a timeline of events. Rehearse the story.

### 4.2 Presentation Route
Add a `?demo=true` query param that:
- Auto-cycles through interesting vessels every 10s
- Highlights one dark vessel and zooms to it
- Shows the investigation flow without manual clicks

### 4.3 Mobile/Tablet Layout
If presenting on a projector, the layout should be clean at 1920×1080. Test and fix any overflow issues at that resolution. The alerts sidebar might be too narrow or overlap.

---

## Priority Order for Implementation

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | Pulse animation on dark vessels | 30 min | High |
| 2 | Scan area boundaries on map | 1 hr | High |
| 3 | Animated vessel trails | 1 hr | High |
| 4 | Notification toasts | 45 min | Medium |
| 5 | Search/fly-to vessel | 1 hr | Medium |
| 6 | Investigation timeline in modal | 2 hr | Very High |
| 7 | Cluster markers | 1.5 hr | Medium |
| 8 | Loading skeletons | 30 min | Low |
| 9 | Demo auto-pilot mode | 2 hr | High (for presentation) |
| 10 | Error boundary | 20 min | Low (insurance) |

---

## What Already Works Well (Don't Touch)

- Dark ocean color scheme — looks professional and "operations center"
- Real-time polling with animated value updates
- Heatmap layer toggle — impressive visual
- Vessel modal with anomaly flags — tells a clear story
- Map legend — clean and informative
- Statistics page with Recharts — good data visualization
- Severity filtering and sorting on alerts panel

---

*Start with items 1-3: they transform the map from "dots on a screen" into a living surveillance system.*

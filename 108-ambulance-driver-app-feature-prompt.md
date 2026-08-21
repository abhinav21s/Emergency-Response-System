# Feature Addition Prompt: Driver App + Hospital Handoff + Alternate-Route Selection

## Context — read before doing anything

This is an **addition to an existing project**, not a fresh build. Two things already
exist and must be read and understood before writing any code:

1. **The 108 public/private ambulance integration project** (dispatcher side): a MERN
   app where an accident is reported, the nearest available ambulance (public or
   private) is computed server-side via Haversine distance, and that ambulance is
   marked dispatched.
2. **A separate ambulance-side project** where a driver, once at the accident spot,
   selects a hospital from a list of nearby hospitals.

Start by exploring the existing codebase(s) in full — models, routes, socket events,
frontend pages/components, and how data currently flows — before adding anything. Do
not assume file names or structures; inspect what's actually there and build on top of
it, keeping consistent conventions (naming, folder layout, coding style) with what
already exists. If the ambulance-side hospital-selection project uses a different
structure or state pattern than the dispatcher project, do not force them into
identical shape — just make sure they interoperate correctly through the shared
backend described below.

---

## What is being added

Right now the flow stops at "nearest ambulance found and marked dispatched." This
addition extends the system all the way through ambulance registration, driver login,
call acceptance, arrival, hospital selection, and route-to-hospital — with real
traffic-aware alternate routes shown at two points in the journey.

### 1. Ambulance registration (in the dispatcher/admin app)

- When registering a new ambulance, request the browser's location (with a
  click-on-map fallback if permission is denied, matching the existing pattern already
  used elsewhere in this project for accident reporting).
- Drop a pin on the map at that location and save it as the ambulance's initial
  position.
- Generate simple login credentials for that ambulance at registration time (an ID plus
  a password or short login code) and store them alongside the ambulance document, so
  the ambulance can log into the separate driver app using them.
- The new ambulance must appear live on every open dispatcher map via the existing
  Socket.io broadcast pattern already used for adding ambulances — extend it to also
  carry the new fields (credentials should not be broadcast to the public map, only
  stored server-side and returned to the registering admin).

### 2. Driver login and "waiting for call" state (ambulance-side project)

- Add a login screen where a driver enters their ambulance's ID and password/code.
- On successful login, the client joins a Socket.io room scoped to that ambulance's ID
  (e.g. `ambulance:<id>`) on the shared backend.
- Show a simple "waiting for call" state until a dispatch event arrives.

### 3. Incoming call notification and accept flow (ambulance-side project)

- When the dispatcher's nearest-ambulance logic assigns this ambulance to an accident,
  emit a targeted Socket.io event to that ambulance's room only (reuse/extend the
  existing dispatch-broadcast logic in the dispatcher backend rather than duplicating
  it).
- The driver app shows an incoming-call alert with the accident location and an
  **Accept** button.
- On accept, update the trip's status server-side (see the shared trip model below) and
  move the driver app into the route-selection screen for leg 1.

### 4. Alternate-route selection — leg 1: ambulance → accident spot

- Use **TomTom for both the map and the routing** in this feature, not a mix of
  providers — the map tiles/base map on every route-picker screen should be
  TomTom's map (via their Maps SDK for Web or the equivalent React wrapper), and the
  actual route calculation should use the **TomTom Routing API**
  (`computeAlternativeRoutes` on, with traffic) so that the polylines returned line up
  correctly with the base map without any projection/rendering mismatch. Use a TomTom
  developer API key (free, no credit card required) and keep it in an environment
  variable, not hardcoded.
- Integrate the TomTom Routing API as a shared backend endpoint, e.g. `POST
  /api/routes`, accepting an origin and destination lat/lng and returning up to three
  route options, each with distance, duration, a traffic-delay figure, and route
  geometry to draw on the map.
- Build one reusable route-picker component (TomTom map + list of the three routes with
  distance/duration/traffic shown per option) and use it here with origin = ambulance's
  current location, destination = accident location.
- On the driver selecting a route, draw it on the TomTom map, store the chosen route on
  the trip document, and update trip status to reflect "en route to accident."
- If the existing dispatcher project currently uses Leaflet + OpenStreetMap for its own
  map screens, leave those screens as they are — this TomTom requirement applies
  specifically to the new route-picker component and any other new screens built in
  this feature addition, not a retrofit of already-working map screens elsewhere in the
  project.

### 5. Marking arrival at the accident spot — build the hybrid approach

Build both of the following together, not just one:

- **Animated countdown (visual polish):** once a route is chosen in step 4, animate a
  marker moving along the chosen route's polyline geometry over a simulated countdown
  derived from the route's returned duration, sped up for demo purposes (e.g. a real
  minute standing in for the actual ETA). When the countdown completes, auto-advance
  the trip status to "at accident" and transition the driver app into hospital
  selection automatically.
- **Manual "I've Arrived" button (reliability/safety net):** show this button on
  screen at all times throughout the countdown, not hidden or disabled while the
  animation runs. Tapping it at any point immediately advances the trip status to "at
  accident" and transitions into hospital selection, regardless of where the animation
  currently is — this lets whoever is presenting the demo skip ahead if the timing
  doesn't line up live, without waiting for the countdown to finish.
- Whichever of the two triggers first is what advances the trip — the animation should
  simply stop/be unmounted if the manual button is pressed first, with no conflicting
  duplicate status updates.
- Apply this same hybrid pattern (animated countdown + always-available manual
  advance button) to leg 2 as well (accident spot → hospital, step 7 below), for
  consistency across both legs of the journey.

### 6. Hospital selection handoff (existing ambulance-side project)

- Reuse the existing hospital-selection component/screen from the ambulance-side
  project as-is, with two integration changes:
  - It must read the accident location from the shared trip document (via a trip ID
    passed through route/context/state) instead of wherever it currently sources its
    origin point.
  - The hospital the driver selects must be written back to that same shared trip
    document (hospital ID and its location) instead of being kept only in the
    hospital-selection project's own local state or backend.
- This screen should appear as a natural continuation of the same driver app flow, not
  a separate disconnected page — carry over the same layout/visual language already
  used for the route-picker and incoming-call screens.

### 7. Alternate-route selection — leg 2: accident spot → hospital

- Reuse the same TomTom-backed route-picker component built in step 4, this time with
  origin = accident location, destination = the chosen hospital's location.
- On the driver selecting a route, draw it, store it on the trip document, and update
  trip status to "en route to hospital."
- Once a route is chosen, apply the same hybrid arrival pattern from step 5 (animated
  countdown along the polyline, plus an always-visible manual "Arrived at Hospital"
  button) to advance the trip to "completed."

---

## Shared data model addition

Add a `Trip` collection/model (Mongoose) shared by both apps through the same backend,
holding at minimum: accident location, assigned ambulance ID, current status (e.g.
`dispatched → en_route_to_accident → at_accident → hospital_selected →
en_route_to_hospital → completed`), the two chosen routes (leg 1 and leg 2, each with
distance/duration/geometry), the chosen hospital, and timestamps for each status
change. Both the dispatcher app and the driver app must read and write this same
document through the shared Express API/Socket.io server — this is what keeps the two
separate React projects in sync without either needing to know the other's internals.

---

## Required behavior / correctness checklist

- Do not duplicate the nearest-ambulance Haversine logic, the ambulance-adding
  broadcast pattern, or any other existing backend logic — extend and reuse what
  already exists in the dispatcher project's codebase.
- The driver app must only receive dispatch notifications meant for its own logged-in
  ambulance (room-scoped Socket.io events), never a broadcast every driver tab
  receives.
- Both route-selection moments (leg 1 and leg 2) must use the same reusable component
  and the same TomTom-backed endpoint — not two separately built implementations.
- The hospital-selection screen must pull the accident location it needs from the
  shared trip document rather than requiring the driver to re-enter or re-select
  anything already known to the system.
- Every status transition must update the shared trip document and be reflected live
  (via Socket.io) on any dispatcher-side view watching that trip, not just on the
  driver's own screen.
- No hardcoded/fake route data — both route-selection screens must show real
  TomTom-returned alternate routes with real distance, duration, and traffic-delay
  figures, rendered on TomTom's own map tiles so the base map and route geometry match.
- Arrival at both the accident spot and the hospital must always be advanceable via the
  manual button, even while the animated countdown is running — the demo must never be
  blocked waiting on the animation.
- All of this must continue to run fully on localhost with no paid services and no
  API keys beyond the free, no-credit-card TomTom API key already chosen for this
  project.

---

## Build instructions for the assistant

1. First, read through the existing dispatcher project and the existing hospital-
   selection project in full — models, API routes, socket events, and frontend
   structure — and summarize your understanding of what already exists before making
   changes.
2. Add the `Trip` model and the shared route-computation endpoint to the existing
   backend, alongside the existing ambulance/dispatch logic, without breaking anything
   currently working.
3. Add ambulance registration's location-capture and credential-generation to the
   existing admin/dispatcher frontend, reusing its existing map and geolocation-
   fallback patterns.
4. Build the driver app's login, waiting, incoming-call, and route-picker (leg 1)
   screens, reusing shared components/styling where the existing projects already
   provide a pattern to follow.
5. Wire in the arrival mechanism (manual button, and optionally the animated
   countdown as a supplement).
6. Integrate the existing hospital-selection component into the driver app with the two
   changes described above (read accident location from trip, write chosen hospital
   back to trip).
7. Build the route-picker (leg 2) using the same reusable component from step 4.
8. Test the full flow yourself end to end — register an ambulance, report an accident
   from the dispatcher app, log in as that ambulance in the driver app, receive and
   accept the call, pick a route, mark arrival, pick a hospital, pick a route to the
   hospital — confirm every status change is reflected live on the dispatcher side, and
   fix any errors found during that test before handing it back rather than leaving
   them for me to discover.

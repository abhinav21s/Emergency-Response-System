# Features

- Dashboard with live fleet statistics: total, public 108, private, available and dispatched.
- Bengaluru-centered Leaflet/OpenStreetMap dispatch map with public/private and availability marker states.
- Accident reporting through browser geolocation, with required click-on-map fallback.
- Server-side Haversine selection of the closest available ambulance only; fleet type has no role in selection.
- MongoDB persistence for ambulance records and dispatch status, designed for a free MongoDB Atlas cluster.
- Socket.io live updates for new ambulances, dispatches, resets and fleet statistics.
- Targeted Socket.io ambulance room for driver incoming-call notifications, plus driver acceptance confirmation.
- Add-ambulance flow with public/private, driver, vehicle and geolocation/map position fields.
- Reset action that restores all ambulances to available and clears dispatch state in every open client.
- Clear no-availability response and straight-line ETA labeled as an estimate at 35 km/h.

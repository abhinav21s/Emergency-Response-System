# System Features

## 1. Unified 108 Dispatch & Command Engine (Port 5173 / Port 5000)

### Real-Time Fleet Telemetry & Command Map
- **Scattered Fleet Distribution**: 18 pre-seeded public (108) and private emergency vehicles organically distributed across Bengaluru.
- **Dynamic Haversine Dispatch**: Server-side proximity algorithm instantly assigns the closest available vehicle to any reported accident scene regardless of public/private fleet designation.
- **Accident Reporting**: Citizen GPS geolocation detection with interactive map pin fallback.
- **TomTom Traffic Routing Engine**: 
  - Real-time TomTom routing API integration with live traffic delay calculation.
  - Generates 3 alternate routes with distance (km), duration (minutes), and real-time traffic delay metrics.
  - Multi-leg journey support: Leg 1 (Ambulance to Accident) and Leg 2 (Accident to Selected Hospital).
- **Socket.io Live Synchronization**: Instant state synchronization across command map, driver dashboards, and hospital terminals for fleet status, dispatches, and capacity adjustments.

---

## 2. Ambulance Driver Terminal (Port 5173 - `/driver`)

### Instant Access & Zero-Friction Workflow
- **No-Login Architecture**: Drivers access terminal directly without password or account barrier, prioritizing emergency response speed.
- **Persistent Local Vehicle Binding**: Drivers select their vehicle once, and identity is remembered across sessions via `localStorage`.
- **Auto-Follow Live Dispatch Mode**: Optional toggle for demonstrations and monitoring that automatically switches the driver view to whichever vehicle receives the latest dispatch call.
- **Global Emergency Alert Banner**: Pulsing high-priority notification displayed on all open terminals with a 1-click "I am this driver — Accept" claim action.
- **Accident Scene Navigation**: Step-by-step route selection, live arrival countdown, and progress simulation.
- **Specialty-Based Hospital Routing**:
  - Distance-sorted hospital recommendations at the accident scene.
  - Specialty filter buttons (Cardiology, Neurology, Trauma Care, Pediatrics, Orthopedics, ICU Available).
  - Live bed capacity metrics (Emergency beds, ICU beds, Doctors on duty).

---

## 3. Hospital Capacity & Network Portal (Port 5173 - `/hospital-portal`)

- **Real-Time Capacity Management**: Instant modification of emergency beds, ICU beds, and on-duty medical personnel.
- **Emergency Diversion Status**: Toggle between "Accepting Emergencies" and "On Diversion (Full)".
- **Incoming Patient Alerts**: Real-time notification banners when an ambulance selects the hospital as its destination.
- **Interactive Hospital Registration**: Map-based registration with TomTom search autocomplete and coordinate positioning.

---

## 4. Hospital Operations Management Portal (Port 3000 / Port 5001)

- **Hospital Authentication**: Secure hospital registration, profile management, and credential login.
- **Doctor Roster & Availability**: Real-time management of doctor shifts, specialties, and on-duty availability.
- **Cross-Service Notification Bridge**: Direct HTTP/WebSocket bridge receiving live incoming patient alerts from the Port 5000 dispatch engine.
- **Hospital Emergency Logs**: Incident and emergency admission records with status tracking.

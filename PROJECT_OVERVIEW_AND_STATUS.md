# Unified Emergency Response System — Project Overview & Architecture Guide

---

## 1. Project Overview

The **Unified Emergency Response & Hospital Routing Platform** is an end-to-end urban emergency management system built for rapid-response dispatch and hospital coordination (demonstrated with Bengaluru city coordinates).

### Core Mission
**"The closest ambulance must always respond, regardless of whether it belongs to the Public (108) or Private fleet."**

When an emergency is reported:
1. The dispatch engine calculates the nearest available ambulance using the Haversine formula across public and private fleets.
2. The assigned driver receives a real-time dispatch alert.
3. TomTom Routing API generates 3 traffic-aware routes with real-time delays.
4. Upon reaching the accident scene, the driver selects the optimal hospital based on proximity, live bed availability, and specialty care requirements.
5. The destination hospital is notified immediately on both monitoring interfaces with ETA and patient arrival details.

---

## 2. System Architecture

The codebase comprises two interconnected services communicating via WebSockets and an internal HTTP bridge:

```
+-----------------------------------------------------------------------------------+
|                            PORT 5173 (Dispatch Client)                            |
|   - 108 Command Map (/map)                                                        |
|   - Ambulance Driver Terminal (/driver) [Auto-Follow & Global Call Banner]         |
|   - Hospital Capacity Portal (/hospital-portal)                                   |
+-----------------------------------------------------------------------------------+
                                      ▲
                                      │ WebSockets (Socket.io)
                                      ▼
+-----------------------------------------------------------------------------------+
|                            PORT 5000 (Dispatch Server)                            |
|   - Fleet Telemetry & Haversine Nearest-Vehicle Selector                          |
|   - TomTom Live Traffic Routing Engine                                            |
|   - MongoDB: Ambulance Fleet, Trips, Hospital Network                             |
+-----------------------------------------------------------------------------------+
                                      │
                                      │ HTTP Bridge POST /api/bridge/incoming-patient
                                      ▼
+-----------------------------------------------------------------------------------+
|                       PORT 5001 (Hospital Backend Server)                         |
|   - Hospital Auth & Doctor Roster Management                                      |
|   - Bridge Socket Emitter -> Broadcasts to Hospital Dashboards                    |
+-----------------------------------------------------------------------------------+
                                      ▲
                                      │ WebSockets (Socket.io)
                                      ▼
+-----------------------------------------------------------------------------------+
|                        PORT 3000 (Hospital Portal Client)                         |
|   - Hospital Register / Login                                                     |
|   - Doctor Roster Management                                                      |
|   - Live Emergency Alerts & Incoming Ambulance Notification Modal                 |
+-----------------------------------------------------------------------------------+
```

---

## 3. Sub-System Details

### System 1: Fleet Dispatch & Routing Engine (Port 5173 / Port 5000)
- **Tech Stack**: React, Vite, Leaflet, TomTom Map API, Express, Socket.io, Mongoose.
- **Components**:
  - **Command Map (`/map`)**: Real-time visualization of 18 organically distributed ambulances. Allows one-click accident creation or GPS positioning.
  - **Driver Terminal (`/driver`)**: Zero-password operator terminal with persistent vehicle binding, optional Auto-Follow mode for demos, global dispatch banner, and 2-leg turn-by-turn routing.
  - **Hospital Capacity Portal (`/hospital-portal`)**: Quick-adjust bed counters, doctor duty rosters, and diversion status toggling.

### System 2: Hospital Operations Management (Port 3000 / Port 5001)
- **Tech Stack**: React, Bootstrap, Express, Socket.io, Mongoose, JWT.
- **Scope**: Dedicated exclusively to hospital administrators. Ambulance registration has been decoupled to ensure clear operational boundaries.
- **Components**:
  - **Registration (`/hospital/register`)**: Onboards hospitals and automatically synchronizes location and metadata with the Port 5000 dispatch registry.
  - **Doctor Management (`/hospital/doctor-management`)**: Manages on-call doctors and availability statuses.
  - **Emergency Notification System**: Receives real-time alerts forwarded from the Port 5000 dispatch bridge.

---

## 4. Key Workflows & Technical Solutions

### A. Driver Workflow & Demo Support
- **Problem**: In automated dispatch, the nearest ambulance is dynamically chosen. In demonstrations or multi-driver setups, a static view could miss calls sent to other units.
- **Solution**:
  - **Auto-Follow Mode**: When enabled, the driver view automatically switches to the dispatched vehicle.
  - **Global Dispatch Banner**: A pulsing alert appears at the top of every open driver terminal with a 1-click *"I am this driver — Accept"* button.
  - **Persistent Binding**: Stores selected vehicle in `localStorage` so regular drivers only see their vehicle without repeated selection.

### B. Cross-Service Hospital Notification Bridge
- **Problem**: Port 3000 connects to Socket.io on Port 5001, whereas dispatch events originate on Port 5000.
- **Solution**: When an ambulance selects a destination hospital on Port 5000, the server emits locally and sends an HTTP POST request to `http://localhost:5001/api/bridge/incoming-patient`. Port 5001 re-emits `hospital:incoming-patient` to all connected hospital dashboards on Port 3000.

### C. Hospital List Stability (Flicker Prevention)
- **Problem**: Hospital list on Port 5173 re-fetched on every state change due to `selectedHospital` in `useEffect` dependencies.
- **Solution**: Decoupled initialization from component state, using functional state updates for socket updates without triggering redundant network calls.

---

## 5. Summary of Service Ports

| Port | Service | Primary URL | Expected Behavior |
|---|---|---|---|
| **5000** | Dispatch Server | `http://localhost:5000/api` | REST API and Socket.io for fleet dispatch and routing |
| **5173** | Dispatch Client | `http://localhost:5173` | Command map, driver terminal, live capacity portal |
| **5001** | Hospital Server | `http://localhost:5001/api` | REST API and Socket.io for hospital management and bridge |
| **3000** | Hospital Client | `http://localhost:3000` | Hospital registration, doctor rosters, and alert modals |

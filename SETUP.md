# Setup & Run Guide

## System Architecture Summary

The project consists of two coordinated services:

| Service | Directory | Tech Stack | Port | Purpose |
|---|---|---|---|---|
| **Dispatch Backend** | `/server` | Node.js, Express, Socket.io, Mongoose | **5000** | Fleet coordination, dispatch algorithm, TomTom routing, cross-bridge notifications |
| **Dispatch Frontend** | `/client` | React, Vite, Leaflet, TomTom Tiles | **5173** | 108 Command Map, Driver Terminal, Live Hospital Capacity Portal |
| **Hospital Backend** | `/ambulance-hospital/server` | Node.js, Express, Socket.io, Mongoose | **5001** | Hospital authentication, doctor rosters, bridge receiver |
| **Hospital Frontend** | `/ambulance-hospital/client` | React, Create React App, Bootstrap | **3000** | Hospital Management Portal, Doctor Availability, Alert Dashboard |

---

## Prerequisites

1. **Node.js**: Version 18 or higher (Node.js 22 supported).
2. **MongoDB**: A running local MongoDB instance (`mongodb://localhost:27017`) or a MongoDB Atlas connection URI.

---

## Environment Configuration

### 1. Dispatch Backend (`server/.env`)
Ensure `server/.env` exists with the following configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ambulance_demo
TOMTOM_API_KEY=YiM8ZHJlnpK4TezEC0VhMMKhd7FqnJ42
CLIENT_URL=http://localhost:5173
```

### 2. Dispatch Frontend (`client/.env`)
Ensure `client/.env` exists:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_TOMTOM_API_KEY=YiM8ZHJlnpK4TezEC0VhMMKhd7FqnJ42
```

### 3. Hospital Backend (`ambulance-hospital/server/.env`)
Ensure `ambulance-hospital/server/.env` exists:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/justice_emergency
JWT_SECRET=justice_secret_key
CLIENT_URL=http://localhost:3000
DISPATCH_API_URL=http://localhost:5000/api
```

---

## Running the Services

Open 4 separate terminal windows in your IDE or shell:

### Terminal 1: Dispatch Backend (Port 5000)
```powershell
cd server
npm install
npm run dev
```
*Look for:* `Server running on port 5000` and `Connected to MongoDB`. Pre-seeds 18 ambulances and major Bangalore hospitals on initial startup.

---

### Terminal 2: Dispatch Frontend (Port 5173)
```powershell
cd client
npm install
npm run dev
```
*Look for:* `VITE ready in ... ms` and URL `http://localhost:5173`.

---

### Terminal 3: Hospital Backend (Port 5001)
```powershell
cd ambulance-hospital/server
npm install
npm run dev
```
*Look for:* `Server running on port 5001 (fixed port as required)`.

---

### Terminal 4: Hospital Frontend (Port 3000)
```powershell
cd ambulance-hospital/client
npm install
npm start
```
*Look for:* Compiled successfully and running at `http://localhost:3000`.

---

## What to Look for on Each Port

### Port 5173 — 108 Dispatch & Driver Center
- **`/` (Landing Page)**: System overview, active fleet statistics, quick navigation links.
- **`/map` (Command Map)**: Full-screen interactive map showing live positions of all 18 ambulances (blue = public 108, green = private). Click anywhere on the map or use GPS to report an accident and trigger instant nearest-vehicle dispatch.
- **`/driver` (Ambulance Driver Terminal)**:
  - Select your ambulance or enable **Auto-Follow Live Dispatch**.
  - Displays high-priority incoming emergency dispatch alerts.
  - Interactive 3-route TomTom traffic selection (Leg 1: to accident scene; Leg 2: to hospital).
  - Hospital handoff selector with specialty filter chips and bed availability metrics.
- **`/hospital-portal` (Hospital Capacity Portal)**: Real-time bed counter adjustments, doctor rosters, and live incoming ambulance alert banner.

### Port 3000 — Hospital Management Portal
- **`/` (Hospital Home)**: Hospital overview and direct access to hospital operations.
- **`/hospital/register`**: Register a new hospital with address, coordinates, emergency phone, and specialty capabilities.
- **`/hospital/login`**: Sign in to the hospital dashboard.
- **`/hospital/dashboard`**: View live doctor availability, hospital stats, and receive incoming ambulance emergency alerts triggered from the Port 5000 dispatch engine.
- **`/hospital/doctor-management`**: Add, edit, or toggle availability of doctors in real time.

---

## End-to-End Demonstration Flow

1. Open **`http://localhost:3000/hospital/login`** in Tab 1 (or register a new hospital). Keep the dashboard open.
2. Open **`http://localhost:5173/driver`** in Tab 2 and toggle **Auto-Follow Live Dispatch: ON**.
3. Open **`http://localhost:5173/map`** in Tab 3. Click anywhere on the map to simulate an accident.
4. Observe the flow:
   - Command map identifies the closest ambulance and dispatches it.
   - Tab 2 (Driver Terminal) automatically receives the call.
   - In Tab 2, click **Accept Dispatch**, select Leg 1 route, click **Arrived at Accident Scene**.
   - Select a destination hospital and choose Leg 2 route.
   - Observe Tab 1 (`:3000`) and the Hospital Portal (`:5173/hospital-portal`): both receive the **Incoming Patient Alert** in real time.

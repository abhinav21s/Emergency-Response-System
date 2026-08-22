# Complete System Guide & Real-Time Hospital Network

## Summary of All Completed Upgrades

### 1. Interactive TomTom Map & Name Autocomplete in Hospital Portal (`:5173/hospital-portal`)
- Added a live **Hospital Name Autocomplete Search** and an **Interactive TomTom Map Picker** directly inside the "➕ Add New" hospital form.
- Typing a hospital name (e.g. *Manipal Hospital, Apollo, Fortis*) automatically fetches coordinates, positions the pin on the TomTom map, and sets the address.
- Users can click anywhere on the TomTom map to place or reposition the hospital pin, automatically updating latitude and longitude.

### 2. TomTom Map Tile Layer on Port 3000 (`:3000/hospital/register`)
- Replaced the OpenStreetMap tiles in `ambulance-hospital/client/src/pages/hospital/Register.js` with **TomTom Map Tiles** using the TomTom API key.
- Now both applications (Port 5173 and Port 3000) render identical vector/raster maps using TomTom.

### 3. Cross-Service Registration Sync (Port 3000 $\rightarrow$ Port 5173)
- When a hospital is registered on **Port 3000** (`/hospital/register`), the backend (`auth.controller.js`) automatically registers and syncs the hospital with the **Port 5000 dispatch network**.
- **Result**: Any hospital added on Port 3000 immediately appears on the **Port 5173 Command Map and Driver Screen**.

### 4. Real-Time Incoming Patient Emergency Alerts
- When a 108 ambulance reaches the accident spot and selects a destination hospital, the server emits `hospital:incoming-patient` over Socket.io.
- The **Hospital Portal** on Port 5173 (and hospital dashboard) receives the alert in real time and displays an **Incoming Emergency Patient Alert Banner** showing:
  - 🚨 Ambulance Name (e.g. *108 Alpha*)
  - 👨‍⚕️ Driver on duty
  - ⏱️ Live ETA (e.g. *ETA: 5 mins*) and distance
  - **Acknowledge & Prepare ER Team** action button.

### 5. TomTom Real-Time Traffic & Routing Calculation
- Traffic calculations make live requests directly to the **official TomTom Routing & Traffic API**:
  `https://api.tomtom.com/routing/1/calculateRoute/...&traffic=true&maxAlternatives=2`
- TomTom computes:
  - Turn-by-turn road length in meters (`lengthInMeters`)
  - Real-time travel time accounting for street congestion (`travelTimeInSeconds`)
  - Delay caused by traffic jams (`trafficDelayInSeconds`)
  - Accurate GPS road polylines following streets and turns (`geometry`).

---

## 🚀 How to Test the Entire Ecosystem

1. **Open Command Map**: `http://localhost:5173/map`
   - See all 12+ pre-seeded hospitals across Bangalore on the TomTom map.
2. **Open Hospital Portal**: `http://localhost:5173/hospital-portal`
   - Click **➕ Add New** $\rightarrow$ Search or click the TomTom map to place a new hospital!
   - Adjust ICU beds / Emergency beds live and watch the driver view update in real time.
3. **Register on Port 3000**: `http://localhost:3000/hospital/register`
   - Register a hospital using the TomTom map $\rightarrow$ It immediately syncs and appears on the 5173 map!
4. **Open Driver View**: `http://localhost:5173/driver`
   - 1-click select `108 Alpha`.
   - Dispatch from `/map` $\rightarrow$ Accept call $\rightarrow$ Pick TomTom route $\rightarrow$ Click **"I've Arrived at Accident"**.
   - Use **Specialty Filter Chips** (e.g., *❤️ Cardiology*, *🫁 ICU Available*).
   - Select a hospital $\rightarrow$ Notice the live **Incoming Emergency Patient Alert Banner** pop up on the Hospital Portal!
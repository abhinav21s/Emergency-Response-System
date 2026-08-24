# Smart 108 Emergency Response System — Complete Project Overview & Architecture Guide

---

## 1. Executive Summary & Core Mission

The **Smart 108 Emergency Response System** is an integrated, full-stack emergency dispatch, paramedic assessment, dynamic hospital routing, and real-time trauma capacity synchronization platform.

### Core Mission & Guiding Principles
1. **Unified Public-Private Fleet Utilization:** The closest and most suitable ambulance must always respond to an emergency, seamlessly pooling government 108 units and participating private hospital ambulances into a single dispatch environment.
2. **Non-Blocking Parallel Transit:** Patient transit begins immediately upon hospital selection. Hospital pre-arrival notification and confirmation run concurrently in the background without halting or delaying the vehicle.
3. **Multi-Factor Clinical Hospital Selection:** Hospital destination ranking incorporates real-time TomTom traffic ETAs, physical distance, live Emergency/ICU bed capacity, and clinical specialty matching (rather than naive nearest-distance routing).
4. **Pre-Arrival Paramedic Clinical Intake:** Paramedics transmit physiological vitals ($\text{BP}$, $\text{HR}$, $\text{RR}$, $\text{SpO}_2$) and chief complaints to trauma teams while in transit, accelerating resuscitation bay readiness.
5. **Live Dynamic GPS Rerouting:** If a destination hospital declines admission or times out, the system calculates the next optimal hospital using the ambulance's *current moving interpolated GPS coordinates* on the road, recalculates TomTom navigation on the fly, and enforces candidate exclusion sets and safety caps.

---

## 2. Microservice & Port Architecture

The system operates as a coordinated multi-service ecosystem across four distinct ports:

```
+----------------------------------------------------------------------------------------------------+
|                                    PORT 5173 (Ambulance Client)                                    |
|   - 108 Command Map (/map) [Live Leaflet/TomTom, Public/Private Vehicle Markers, Incident Trigger] |
|   - Paramedic / Driver Terminal (/driver) [2-Leg Turn-by-Turn, Clinical Intake Modal, Auto-Follow] |
|   - Emergency Dispatcher (/dispatch)                                                               |
+----------------------------------------------------------------------------------------------------+
                                                  ▲
                                                  │ WebSockets (Socket.io) & REST API
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                   PORT 5000 (Dispatch Server)                                      |
|   - Fleet Telemetry, Incident State Machine, & Multi-Factor Ambulance Allocation Engine             |
|   - TomTom Live Traffic Routing Engine & Dynamic Rerouting Engine                                  |
|   - Dynamic Hospital Composite Scoring Engine (Formula 2)                                          |
|   - MongoDB (Port 5000): Ambulance Fleet, Trips (Leg 1 & Leg 2), Hospital Network                   |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ HTTP Dual-Dispatch Bridge (POST /api/bridge/...)
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                PORT 5001 (Hospital Backend Server)                                 |
|   - Hospital Authentication (JWT), Profile, & Doctor Roster Management                             |
|   - Bridge Socket Emitter -> Broadcasts Alerts to Port 3000 Dashboards                             |
|   - MongoDB (Port 5001): Users (Hospital Accounts), Emergencies, Doctors                           |
+----------------------------------------------------------------------------------------------------+
                                                  ▲
                                                  │ WebSockets (Socket.io) & REST API
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                 PORT 3000 (Hospital Portal Client)                                 |
|   - Hospital Unified Login (/hospital/login & /login) & Registration (/hospital/register)           |
|   - Live Command Dashboard (/hospital/dashboard) [1-Click Emergency/ICU Bed & Diversion Controls]  |
|   - Emergency Inbound Alerts (/hospital/emergency-requests) [Pre-Arrival Vitals & 1-Click Response] |
|   - Doctor Roster Management (/hospital/doctor-management) & Facility Profile (/hospital/profile)  |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Mathematical Formulations & Decision Engines

### A. Multi-Factor Ambulance Allocation Score
$$\text{Score}_{\text{amb}} = \alpha \cdot T_{\text{ETA}} + \beta \cdot D_{\text{distance}} + \gamma \cdot \text{TrafficDelay} + \delta \cdot \text{FleetPriority}$$
- Evaluates candidate ambulances across government (108) and private fleets using live TomTom routing and vehicle telemetry.
- Dispatches the fastest available vehicle to the emergency scene.

### B. Hospital Candidate Specialty Filtering (Equation 1)
$$\mathcal{H}_c = \{h \in \mathcal{H} \mid S_h \ge S_{\min}\}$$
- Filters the complete hospital registry $\mathcal{H}$ into candidate subset $\mathcal{H}_c$.
- Excludes facilities on diversion (`accepting: false`) or lacking the clinical specialty required for the patient's condition (e.g. Cardiology, Neurology, Trauma Surgery, Pediatrics).

### C. Dynamic Hospital Composite Scoring Function (Equation 2)
$$\text{Score}_h = w_1 T_h + w_2 D_h + w_3 A_h + w_4 S_h$$
- **Weights Applied:**
  - $w_1 = 0.40$ (Traffic ETA / Travel Time)
  - $w_2 = 0.25$ (Road Network Distance)
  - $w_3 = 0.20$ (Live Emergency & ICU Bed Availability)
  - $w_4 = 0.15$ (Clinical Specialty Match & Doctor Availability)
- **Normalization:**
  - $\text{Norm}(T_h) = 1 - \frac{\text{ETA}_h}{\max(\text{ETA})}$
  - $\text{Norm}(D_h) = 1 - \frac{D_h}{\max(D)}$
  - $\text{Norm}(A_h) = \min\left(1.0, \frac{\text{Beds}_{\text{emergency}} + 2 \cdot \text{Beds}_{\text{icu}}}{20}\right)$
  - $\text{Norm}(S_h) = 1.0 \text{ (exact specialty match)} \mid 0.5 \text{ (general emergency)}$
- Produces an explainable, ranked hospital recommendation list for the paramedic and control center.

---

## 4. End-to-End Operational Lifecycle & Key Features

```
[1. Incident Reported] ──────> [2. Ambulance Dispatched] ──────> [3. Leg 1: Transit to Scene]
                                                                             │
[6. Parallel Confirmation] <── [5. Hospital Selected] <────── [4. On-Scene Paramedic Intake]
       │                            (Transit Begins)
       ├──> [Accepted] ────────> [7. Bay Prepared] ───────────> [8. Admission & Hand-off]
       │
       └──> [Declined / Timeout]
                   │
                   ▼
       [Live Dynamic Rerouting] ───> [Compute from Moving GPS] ───> [Safety Cap Check (k >= 3)]
```

### 1. Incident Creation & Dispatch
- Dispatcher drops an accident marker on the command map.
- The system identifies the nearest available public or private ambulance and generates 3 traffic-aware TomTom routes.
- The selected ambulance transitions to `en_route_to_accident`.

### 2. Leg 1 Transit & On-Scene Arrival
- The driver terminal tracks real-time progress along the route polyline with live countdowns and simulated movement.
- Upon arrival, status transitions to `at_accident`.

### 3. Pre-Arrival Paramedic Clinical Intake
- Paramedic opens the **Clinical Intake Modal** to record physiological vitals ($\text{BP}$, $\text{HR}$, $\text{RR}$, $\text{SpO}_2$), chief clinical complaint, and triage severity.
- Vitals automatically attach to the electronic emergency record.

### 4. Dynamic Hospital Selection & Non-Blocking Parallel Transit
- System filters and ranks hospitals using the 4-factor composite scoring engine.
- Driver selects the top-ranked hospital.
- **Ambulance begins Leg 2 transit immediately**: Vehicle motion does not halt while waiting for hospital confirmation.

### 5. Cross-Service Hospital Notification & Response
- Receiving hospital receives an instant visual alarm and audio alert on Port 3000 containing ETA, distance, and full clinical intake vitals.
- **Immediate Dual-Dispatch:** Hospital clicks (*Accept* or *Decline*) send instant updates across both Port 5001 and Port 5000.
  - **Accept:** Locks driver badge to green `ADMISSION CONFIRMED`.
  - **Decline / 15s Timeout:** Triggers live dynamic rerouting instantly.

### 6. Live Dynamic Background Rerouting
- **Current Interpolated Moving Position:** The reroute engine computes the next destination from the ambulance's *current moving GPS coordinates*, rather than restarting from the scene.
- **Candidate Exclusion Set $\mathcal{E}$:** Previously declined or timed-out hospitals are excluded to prevent routing loops.
- **Safety Override Cap ($k \ge 3$):** If 3 hospitals decline/timeout, the system activates a safety override to navigate directly to the nearest emergency facility.

### 7. Facility Hand-Off & Fleet Reset
- Upon reaching the hospital bay, paramedic confirms patient transfer.
- Hospital marks emergency as admitted/completed.
- Ambulance status resets to `available` on the command map.

---

## 5. Sub-System Details & Components

### A. Fleet Dispatch & Driver Terminal (Port 5173 / Port 5000)
- **Technology:** React (Vite), Leaflet, TomTom Maps SDK, Express, Socket.io, Mongoose.
- **Key Modules:**
  - `MapPicker.jsx`: Interactive map with rounded-capsule ambulance markers (`108 PUBLIC` & `PRIVATE`) and hospital pins showing live ICU beds.
  - `Driver.jsx`: Operator terminal with turn-by-turn routing, Auto-Follow demo mode, Global Dispatch Banner, and Parallel Confirmation card.
  - `ClinicalIntakeModal.jsx`: High-contrast modal for entering patient vitals and chief complaints.
  - `RoutePicker.jsx`: Visual route selection with synchronized color indicators matching map polylines (Blue, Amber, Green).
  - `ArrivalCountdown.jsx`: Real-time progress bar, dynamic speed simulation, and completion trigger.

### B. Hospital Operations & Emergency Portal (Port 3000 / Port 5001)
- **Technology:** React, React-Bootstrap, Express, Socket.io, Mongoose, JWT.
- **Key Modules:**
  - `Dashboard.js`: Live dashboard with 1-click Free Emergency Bed and ICU Bed counters, instant diversion mode toggle, and live 108 dispatch sync.
  - `EmergencyRequests.js`: Real-time emergency queue with patient vitals, inbound notes, and 1-click Accept/Decline/Admit actions.
  - `HospitalNotifications.js`: High-contrast emergency modal displaying patient intake, vitals pill box, and dual-dispatch response buttons.
  - `DoctorManagement.js`: Specialist roster management and on-duty availability controls.
  - `Login.js` & `Register.js`: Unified authentication portal for hospital emergency facilities.

---

## 6. Seeded Hospital Credentials (MongoDB Atlas)

The following hospital facilities are seeded with complete emergency and trauma credentials:

| Hospital Facility | Email Credential | Password | Trauma Level | Initial Beds (ER / ICU) |
| :--- | :--- | :--- | :--- | :--- |
| **Fortis Hospital, Bannerghatta** | `fortis@hospital.com` | `Password@123` | Level 1 Trauma | 14 / 8 |
| **St. Martha's Hospital** | `stmarthas@hospital.com` | `Password@123` | Level 2 Emergency | 10 / 5 |
| **Bengaluru City Hospital** | `bengaluru@hospital.com` | `Password@123` | Level 1 Trauma | 16 / 9 |
| **Manipal Hospital, Old Airport Rd** | `manipal@hospital.com` | `Password@123` | Level 1 Trauma | 20 / 12 |
| **Apollo Hospital, Jayanagar** | `apollo@hospital.com` | `Password@123` | Level 1 Trauma | 15 / 8 |
| **Victoria Hospital (BMCRI)** | `victoria@hospital.com` | `Password@123` | Level 1 Trauma | 30 / 15 |
| **NIMHANS** | `nimhans@hospital.com` | `Password@123` | Specialty Neuro/Trauma | 12 / 10 |

---

## 7. Design System & Aesthetics

- **Color Palette:** Modern **Titanium Slate (`#e9edf2`)** light theme with elevated `#f5f8fc` card surfaces and `#cbd5e1` borders.
- **Typography:** High-contrast **Deep Navy (`#0f2942`)** headings and **Slate Navy (`#334e68` / `#1e3a5f`)** body text.
- **Accents:** Deep Ocean Cobalt (`#1e56a0`), Medical Teal (`#0f766e`), Rose Emergency Red (`#dc2626`), and Amber Warning (`#d97706`).
- **Responsive Layout:** Fully responsive grid systems across mobile, tablet, and widescreen command center monitors.

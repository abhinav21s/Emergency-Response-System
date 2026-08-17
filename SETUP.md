# Setup

Prerequisites: Node.js 18+ and a free MongoDB Atlas cluster.

1. In Atlas, create a database user and add your current IP address under **Network Access**. Copy the Node.js connection string, replacing the password and setting the database name to `ambulance_demo`.
2. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` to that connection string. The `.env` file must not be committed.
3. In one terminal:

   ```powershell
   cd server
   npm install
   npm run dev
   ```

4. In another terminal:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

Open `http://localhost:5173`. The server starts on port 5000 and seeds 18 ambulances on its first successful database connection. Run `npm test` inside `server` to test the Haversine dispatch helper, and `npm run build` inside `client` for a production build check.

For driver-event testing, open `/driver` in a second browser tab, select the ambulance shown as dispatched on the map, then report an accident close to that ambulance. Only that selected driver tab receives the incoming call event.

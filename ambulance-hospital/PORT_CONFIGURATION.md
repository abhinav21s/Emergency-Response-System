# Justice_MDB Port Configuration

## IMPORTANT: Port Requirements

This application has strict port requirements that must never be changed:

1. The server **MUST** always use port 5001
2. The client application **MUST** always use port 3000

## Key Points

### Server (Port 5001)
- The server is configured to always use port 5001, regardless of any environment variables
- A port manager utility has been implemented that will automatically kill any process using port 5001 when the server starts
- All client API configurations have been centralized to use port 5001
- The socket connection also uses port 5001

### Client (Port 3000)
- The client application is configured to always use port 3000
- A client port manager utility has been implemented that will automatically kill any process using port 3000
- The npm start script has been updated to force port 3000
- A custom start script (npm run start:fixed) is available that ensures port 3000 is free before starting

## Implementation Details

### Server Port Management
1. A port manager utility has been created at `server/utils/portManager.js` that:
   - Detects if port 5001 is in use
   - Automatically terminates any process using port 5001
   - Works on both Windows and Unix-based systems

2. The server startup process has been modified to:
   - First ensure port 5001 is available
   - Ignore any PORT environment variable
   - Always use port 5001

### Client Port Management
1. A client port manager utility has been created at `client/src/utils/clientPortManager.js` that:
   - Detects if port 3000 is in use
   - Automatically terminates any process using port 3000
   - Works on both Windows and Unix-based systems

2. The client startup process has been modified to:
   - Force port 3000 through environment variables in package.json
   - Provide a custom start script that ensures port 3000 is available

3. Client API configuration has been centralized in:
   - `client/src/utils/axiosConfig.js` - Exports API_CONFIG with BASE_URL set to port 5001
   - `client/src/services/api.js` - Uses and re-exports the API_CONFIG

## Troubleshooting

### Server Issues (Port 5001)
If you encounter issues with the server not starting:

1. Check if another process is using port 5001 (the server should automatically handle this)
2. If manual intervention is needed, you can run:
   - On Windows: `netstat -ano | findstr :5001` to find the PID, then `taskkill /F /PID <PID>`
   - On Unix/Linux/Mac: `lsof -i :5001 -t | xargs kill -9`

### Client Issues (Port 3000)
If you encounter issues with the client not starting on port 3000:

1. Use the custom start script: `npm run start:fixed` which will automatically kill any process using port 3000
2. If manual intervention is needed, you can run:
   - On Windows: `netstat -ano | findstr :3000` to find the PID, then `taskkill /F /PID <PID>`
   - On Unix/Linux/Mac: `lsof -i :3000 -t | xargs kill -9`

## DO NOT CHANGE THE PORTS

Under no circumstances should the ports be changed from their designated values:
- Server must always use port 5001
- Client must always use port 3000

The application is designed to work specifically with these ports.

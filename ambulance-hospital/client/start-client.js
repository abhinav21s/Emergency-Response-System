/**
 * Custom script to start the Justice_MDB client application on port 3000
 * This script will kill any process using port 3000 before starting the client
 */

const { exec, spawn } = require('child_process');
const { CLIENT_PORT, ensureClientPortAvailable } = require('./src/utils/clientPortManager');

// Set the environment variable to force port 3000
process.env.PORT = CLIENT_PORT;

// Function to start the React application
const startReactApp = () => {
  console.log(`Starting client application on port ${CLIENT_PORT}...`);
  
  // Use cross-platform command
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'npm.cmd' : 'npm';
  
  // Force port 3000 by setting environment variable
  const env = { ...process.env, PORT: CLIENT_PORT.toString() };
  
  // Start the React app with the specified port
  // For Windows, we need to use a different approach
  if (isWindows) {
    // On Windows, run the command with the PORT environment variable set in the command
    exec(`set PORT=${CLIENT_PORT} && npm start`, {
      stdio: 'inherit',
      shell: true
    }, (error) => {
      if (error) {
        console.error(`Error starting client application: ${error.message}`);
        process.exit(1);
      }
    });
  } else {
    // On Unix systems, use spawn with environment variables
    const reactProcess = spawn(command, ['start'], { 
      env,
      stdio: 'inherit',
      shell: true
    });
    
    reactProcess.on('error', (error) => {
      console.error(`Error starting client application: ${error.message}`);
      process.exit(1);
    });
    
    // Handle process exit
    reactProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Client application exited with code ${code}`);
      }
    });
  }
};

// Main function to ensure port is available and start the client
const main = async () => {
  try {
    // First ensure port 3000 is available
    await ensureClientPortAvailable();
    
    // Start the React application
    startReactApp();
  } catch (error) {
    console.error(`Error in client startup: ${error.message}`);
    process.exit(1);
  }
};

// Run the main function
main();

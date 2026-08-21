const { exec } = require('child_process');
const os = require('os');

/**
 * Utility to manage port 3000 for the Justice_MDB client application
 * This ensures the port is always available by killing any process using it
 */
const CLIENT_PORT = 3000;

/**
 * Kills any process using port 3000
 * @returns {Promise<boolean>} True if port was freed or already free, false if there was an error
 */
const ensureClientPortAvailable = () => {
  return new Promise((resolve) => {
    console.log(`Ensuring client port ${CLIENT_PORT} is available...`);
    
    // Command differs based on OS
    const isWindows = os.platform() === 'win32';
    
    if (isWindows) {
      // Windows command to find PID using the port
      exec(`netstat -ano | findstr :${CLIENT_PORT}`, (error, stdout) => {
        if (error || !stdout) {
          console.log(`Port ${CLIENT_PORT} is already available.`);
          return resolve(true);
        }
        
        // Extract PID from netstat output
        const lines = stdout.split('\n');
        const pidRegex = /LISTENING\s+(\d+)/;
        
        for (const line of lines) {
          const match = line.match(pidRegex);
          if (match && match[1]) {
            const pid = match[1];
            console.log(`Found process ${pid} using port ${CLIENT_PORT}. Killing process...`);
            
            // Kill the process
            exec(`taskkill /F /PID ${pid}`, (killError) => {
              if (killError) {
                console.error(`Error killing process: ${killError.message}`);
                return resolve(false);
              }
              
              console.log(`Successfully killed process ${pid}. Port ${CLIENT_PORT} is now available.`);
              return resolve(true);
            });
            
            return;
          }
        }
        
        console.log(`No LISTENING process found on port ${CLIENT_PORT}.`);
        resolve(true);
      });
    } else {
      // Unix/Linux/Mac command
      exec(`lsof -i :${CLIENT_PORT} -t`, (error, stdout) => {
        if (error || !stdout) {
          console.log(`Port ${CLIENT_PORT} is already available.`);
          return resolve(true);
        }
        
        const pid = stdout.trim();
        console.log(`Found process ${pid} using port ${CLIENT_PORT}. Killing process...`);
        
        // Kill the process
        exec(`kill -9 ${pid}`, (killError) => {
          if (killError) {
            console.error(`Error killing process: ${killError.message}`);
            return resolve(false);
          }
          
          console.log(`Successfully killed process ${pid}. Port ${CLIENT_PORT} is now available.`);
          return resolve(true);
        });
      });
    }
  });
};

module.exports = {
  CLIENT_PORT,
  ensureClientPortAvailable
};

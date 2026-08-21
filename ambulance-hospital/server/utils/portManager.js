const { exec } = require('child_process');
const os = require('os');

/**
 * Utility to manage port 5001 for the Justice_MDB server
 * This ensures the port is always available by killing any process using it
 */
const PORT = 5001;

/**
 * Kills any process using port 5001
 * @returns {Promise<boolean>} True if port was freed or already free, false if there was an error
 */
const ensurePortAvailable = () => {
  return new Promise((resolve) => {
    console.log(`Ensuring port ${PORT} is available...`);
    
    // Command differs based on OS
    const isWindows = os.platform() === 'win32';
    
    if (isWindows) {
      // Windows command to find PID using the port
      exec(`netstat -ano | findstr :${PORT}`, (error, stdout) => {
        if (error || !stdout) {
          console.log(`Port ${PORT} is already available.`);
          return resolve(true);
        }
        
        // Extract PID from netstat output
        const lines = stdout.split('\n');
        const pidRegex = /LISTENING\s+(\d+)/;
        
        for (const line of lines) {
          const match = line.match(pidRegex);
          if (match && match[1]) {
            const pid = match[1];
            console.log(`Found process ${pid} using port ${PORT}. Killing process...`);
            
            // Kill the process
            exec(`taskkill /F /PID ${pid}`, (killError) => {
              if (killError) {
                console.error(`Error killing process: ${killError.message}`);
                return resolve(false);
              }
              
              console.log(`Successfully killed process ${pid}. Port ${PORT} is now available.`);
              return resolve(true);
            });
            
            return;
          }
        }
        
        console.log(`No LISTENING process found on port ${PORT}.`);
        resolve(true);
      });
    } else {
      // Unix/Linux/Mac command
      exec(`lsof -i :${PORT} -t`, (error, stdout) => {
        if (error || !stdout) {
          console.log(`Port ${PORT} is already available.`);
          return resolve(true);
        }
        
        const pid = stdout.trim();
        console.log(`Found process ${pid} using port ${PORT}. Killing process...`);
        
        // Kill the process
        exec(`kill -9 ${pid}`, (killError) => {
          if (killError) {
            console.error(`Error killing process: ${killError.message}`);
            return resolve(false);
          }
          
          console.log(`Successfully killed process ${pid}. Port ${PORT} is now available.`);
          return resolve(true);
        });
      });
    }
  });
};

module.exports = {
  PORT,
  ensurePortAvailable
};

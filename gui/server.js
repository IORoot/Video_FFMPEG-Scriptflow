const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the build directory (but not for API routes)
app.use('/static', express.static(path.join(__dirname, 'build', 'static')));

// API endpoint to execute pipeline
app.post('/api/execute-pipeline', async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({ error: 'No config provided' });
    }

    // Create temporary config file
    const projectRoot = '/Users/andypearson/Code/Video_FFMPEG-Scriptflow';
    const tempConfigPath = path.join(projectRoot, 'temp_gui_config.json');
    
    // Write config to file
    fs.writeFileSync(tempConfigPath, config);
    
    // Execute scriptflow command
    const command = `cd "${projectRoot}" && ./scriptflow.sh -C "${tempConfigPath}"`;
    
    exec(command, { cwd: projectRoot }, (error, stdout, stderr) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempConfigPath);
      } catch (cleanupError) {
        console.warn('Could not clean up temp config file:', cleanupError.message);
      }
      
      if (error) {
        console.error('Execution failed:', error.message);
        res.status(500).json({ 
          error: error.message,
          stderr: stderr,
          success: false
        });
      } else {
        console.log('Execution successful:', stdout);
        res.json({ 
          success: true,
          output: stdout,
          stderr: stderr || null
        });
      }
    });

  } catch (error) {
    console.error('API error:', error.message);
    res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
});

// Serve React app for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Project root: /Users/andypearson/Code/Video_FFMPEG-Scriptflow`);
});

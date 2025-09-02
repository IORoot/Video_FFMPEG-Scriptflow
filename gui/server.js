const express = require('express');
const { exec, spawn } = require('child_process');
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
    
    // Execute scriptflow command using spawn for better output handling
    const scriptflowPath = path.join(projectRoot, 'scriptflow.sh');
    const child = spawn('bash', [scriptflowPath, '-C', tempConfigPath], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    // Capture stdout
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    // Capture stderr
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempConfigPath);
      } catch (cleanupError) {
        console.warn('Could not clean up temp config file:', cleanupError.message);
      }
      
      if (code !== 0) {
        console.error('Execution failed with code:', code);
        console.error('stderr:', stderr);
        res.status(500).json({ 
          error: `Script exited with code ${code}`,
          stderr: stderr,
          stdout: stdout,
          success: false
        });
      } else {
        console.log('Execution successful');
        console.log('stdout:', stdout);
        if (stderr) {
          console.log('stderr:', stderr);
        }
        res.json({ 
          success: true,
          output: stdout + (stderr ? '\n' + stderr : ''),
          stdout: stdout,
          stderr: stderr || null
        });
      }
    });

    child.on('error', (error) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempConfigPath);
      } catch (cleanupError) {
        console.warn('Could not clean up temp config file:', cleanupError.message);
      }
      
      console.error('Spawn error:', error.message);
      res.status(500).json({ 
        error: error.message,
        success: false
      });
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

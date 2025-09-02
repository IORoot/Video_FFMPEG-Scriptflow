require('dotenv').config();
const express = require('express');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const PORT = 3002;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
  callbackURL: "http://localhost:3002/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Serve static files from the build directory (but not for API routes)
app.use('/static', express.static(path.join(__dirname, 'build', 'static')));

// Authentication routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: 'http://localhost:3000/login' }),
  (req, res) => {
    res.redirect('http://localhost:3000');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        name: req.user.displayName,
        email: req.user.emails[0].value,
        picture: req.user.photos[0].value
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Layout management API
const layoutsDir = path.join(__dirname, 'user-layouts');
if (!fs.existsSync(layoutsDir)) {
  fs.mkdirSync(layoutsDir, { recursive: true });
}

app.get('/api/layouts', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = req.user.id;
  const userLayoutsDir = path.join(layoutsDir, userId);
  
  if (!fs.existsSync(userLayoutsDir)) {
    return res.json([]);
  }

  try {
    const files = fs.readdirSync(userLayoutsDir);
    const layouts = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(userLayoutsDir, file);
        const stats = fs.statSync(filePath);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return {
          id: file.replace('.json', ''),
          name: content.name || file.replace('.json', ''),
          createdAt: stats.birthtime,
          updatedAt: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json(layouts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load layouts' });
  }
});

app.post('/api/layouts', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { name, layout } = req.body;
  if (!name || !layout) {
    return res.status(400).json({ error: 'Name and layout are required' });
  }

  const userId = req.user.id;
  const userLayoutsDir = path.join(layoutsDir, userId);
  
  if (!fs.existsSync(userLayoutsDir)) {
    fs.mkdirSync(userLayoutsDir, { recursive: true });
  }

  const layoutId = Date.now().toString();
  const layoutData = {
    name,
    layout,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const filePath = path.join(userLayoutsDir, `${layoutId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(layoutData, null, 2));
    res.json({ id: layoutId, ...layoutData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save layout' });
  }
});

app.get('/api/layouts/:id', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.params;
  const userId = req.user.id;
  const filePath = path.join(layoutsDir, userId, `${id}.json`);

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load layout' });
  }
});

app.delete('/api/layouts/:id', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.params;
  const userId = req.user.id;
  const filePath = path.join(layoutsDir, userId, `${id}.json`);

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete layout' });
  }
});

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

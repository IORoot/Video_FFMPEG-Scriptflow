require('dotenv').config();
const express = require('express');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { google } = require('googleapis');

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
  // Store tokens with the profile for Google Drive access
  profile.accessToken = accessToken;
  profile.refreshToken = refreshToken;
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
app.get('/auth/google', passport.authenticate('google', { 
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'] 
}));

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

// Google Drive service
const getDriveService = (accessToken) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
};

const getOrCreateLayoutsFolder = async (drive, userId) => {
  try {
    // Search for existing layouts folder
    const response = await drive.files.list({
      q: `name='FFMPEG-Scriptflow-Layouts' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)'
    });

    if (response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create new layouts folder
    const folderResponse = await drive.files.create({
      requestBody: {
        name: 'FFMPEG-Scriptflow-Layouts',
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });

    return folderResponse.data.id;
  } catch (error) {
    console.error('Error creating layouts folder:', error);
    throw error;
  }
};

app.get('/api/layouts', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const drive = getDriveService(req.user.accessToken);
    const folderId = await getOrCreateLayoutsFolder(drive, req.user.id);

    // List all JSON files in the layouts folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and name contains '.json' and trashed=false`,
      fields: 'files(id, name, createdTime, modifiedTime)',
      orderBy: 'modifiedTime desc'
    });

    const layouts = response.data.files.map(file => ({
      id: file.id,
      name: file.name.replace('.json', ''),
      createdAt: file.createdTime,
      updatedAt: file.modifiedTime
    }));

    res.json(layouts);
  } catch (error) {
    console.error('Error loading layouts:', error);
    res.status(500).json({ error: 'Failed to load layouts' });
  }
});

app.post('/api/layouts', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { name, layout } = req.body;
  if (!name || !layout) {
    return res.status(400).json({ error: 'Name and layout are required' });
  }

  try {
    const drive = getDriveService(req.user.accessToken);
    const folderId = await getOrCreateLayoutsFolder(drive, req.user.id);

    const layoutData = {
      name,
      layout,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const fileName = `${name}.json`;
    const fileContent = JSON.stringify(layoutData, null, 2);

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId]
      },
      media: {
        mimeType: 'application/json',
        body: fileContent
      },
      fields: 'id, name, createdTime, modifiedTime'
    });

    const savedLayout = {
      id: response.data.id,
      name: name,
      createdAt: response.data.createdTime,
      updatedAt: response.data.modifiedTime
    };

    res.json(savedLayout);
  } catch (error) {
    console.error('Error saving layout:', error);
    res.status(500).json({ error: 'Failed to save layout' });
  }
});

app.get('/api/layouts/:id', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.params;

  try {
    const drive = getDriveService(req.user.accessToken);
    
    const response = await drive.files.get({
      fileId: id,
      alt: 'media'
    });

    // Handle different response formats
    let layoutData;
    if (typeof response.data === 'string') {
      layoutData = JSON.parse(response.data);
    } else if (typeof response.data === 'object') {
      layoutData = response.data;
    } else {
      throw new Error('Unexpected response format from Google Drive');
    }

    res.json(layoutData);
  } catch (error) {
    console.error('Error loading layout:', error);
    if (error.response && error.response.status === 404) {
      res.status(404).json({ error: 'Layout not found' });
    } else {
      res.status(500).json({ error: 'Failed to load layout' });
    }
  }
});

app.delete('/api/layouts/:id', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.params;

  try {
    const drive = getDriveService(req.user.accessToken);
    
    await drive.files.delete({
      fileId: id
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting layout:', error);
    if (error.response && error.response.status === 404) {
      res.status(404).json({ error: 'Layout not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete layout' });
    }
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

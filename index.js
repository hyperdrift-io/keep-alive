import express from 'express';
import nodeCron from 'node-cron';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

// Initialize LowDB with path from environment variable or default
const DB_PATH = process.env.DB_PATH || 'db.json';
const adapter = new JSONFile(DB_PATH);
const db = new Low(adapter, { uris: [], settings: { pingInterval: 5 } });

async function main() {
  // Load database
  await db.read();

  // Ensure default settings exist
  if (!db.data) {
    db.data = { uris: [], settings: { pingInterval: 5 } };
  } else if (!db.data.settings) {
    db.data.settings = { pingInterval: 5 };
  }

  // Save initialized database
  await db.write();

  // Function to check if a URL is valid
  function isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Function to ping a URI
  async function pingURI(uri) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const response = await fetch(uri.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'WakeUp Health Check (https://github.com/yannvr/hyper)'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok ? 'up' : 'down';
    } catch (error) {
      console.error(`Error pinging ${uri.url}:`, error);
      return 'down';
    }
  }

  // Function to check all URIs
  async function checkAllURIs() {
    if (!db.data) return;

    let updated = false;

    for (const uri of db.data.uris) {
      try {
        const status = await pingURI(uri);

        // Only update if status changed or this is the first check
        if (uri.status !== status || uri.lastChecked === null) {
          uri.status = status;
          uri.lastChecked = new Date().toISOString();
          updated = true;

          // Log status change
          console.log(`[${new Date().toISOString()}] ${uri.url} is ${status.toUpperCase()}`);
        }
      } catch (error) {
        console.error(`Error checking ${uri.url}:`, error);
      }
    }

    // Save changes if any
    if (updated) {
      await db.write();
    }
  }

  // Create Express app
  const app = express();
  app.use(express.json());

  // Serve static files from dist directory
  app.use(express.static(join(process.cwd(), 'dist')));

  // API endpoints
  const api = express.Router();

  // Get all URIs
  api.get('/uris', (req, res) => {
    res.json(db.data?.uris || []);
  });

  // Add a new URI
  api.post('/uris', async (req, res) => {
    const { url } = req.body;

    if (!url || !isValidURL(url)) {
      return res.status(400).send('Invalid URL');
    }

    if (!db.data) return res.status(500).send('Database error');

    // Check if URI already exists
    const existingURI = db.data.uris.find(u => u.url === url);
    if (existingURI) {
      return res.status(409).send('URI already exists');
    }

    const newURI = {
      id: Math.random().toString(36).substring(2, 15),
      url,
      status: 'unknown',
      lastChecked: null,
      createdAt: new Date().toISOString()
    };

    db.data.uris.push(newURI);
    await db.write();

    // Run an immediate check for this URI
    try {
      const status = await pingURI(newURI);
      newURI.status = status;
      newURI.lastChecked = new Date().toISOString();
      await db.write();
    } catch (error) {
      console.error('Error checking new URI:', error);
    }

    res.json(newURI);
  });

  // Delete a URI
  api.delete('/uris/:id', async (req, res) => {
    const { id } = req.params;

    if (!db.data) return res.status(500).send('Database error');

    const uriIndex = db.data.uris.findIndex(u => u.id === id);
    if (uriIndex === -1) {
      return res.status(404).send('URI not found');
    }

    db.data.uris.splice(uriIndex, 1);
    await db.write();

    res.json({ success: true });
  });

  // Get the logs
  api.get('/logs', async (req, res) => {
    try {
      const logsDir = join(process.cwd(), 'logs');
      const logFilePath = join(logsDir, 'wakeup.log');
      try {
        await stat(logFilePath);
      } catch {
        return res.json({ logs: [] });
      }
      const logContents = await readFile(logFilePath, 'utf-8');
      const lines = logContents.split('\n').filter(line => line.trim() !== '');
      res.json({ logs: lines.slice(-100) });
    } catch (error) {
      console.error('Error reading logs:', error);
      res.json({ logs: [] });
    }
  });

  // Get settings
  api.get('/settings', (req, res) => {
    if (!db.data || !db.data.settings) {
      return res.json({ pingInterval: 5 });
    }
    res.json(db.data.settings);
  });

  // Update settings
  api.post('/settings', async (req, res) => {
    const { pingInterval } = req.body;

    if (!db.data) return res.status(500).send('Database error');

    if (typeof pingInterval !== 'number' || pingInterval < 1 || pingInterval > 60) {
      return res.status(400).send('Invalid ping interval (must be between 1 and 60)');
    }

    db.data.settings.pingInterval = pingInterval;
    await db.write();

    res.json(db.data.settings);
  });

  // Update URI ping interval
  api.post('/uris/:id/ping-interval', async (req, res) => {
    const { id } = req.params;
    const { pingInterval } = req.body;

    if (!db.data) return res.status(500).send('Database error');

    const uriIndex = db.data.uris.findIndex(u => u.id === id);
    if (uriIndex === -1) {
      return res.status(404).send('URI not found');
    }

    if (pingInterval === null) {
      delete db.data.uris[uriIndex].pingInterval;
      await db.write();
      console.log(`URI ${id} ping interval removed, reverting to global setting`);
    } else if (typeof pingInterval === 'number' && pingInterval >= 1 && pingInterval <= 60) {
      db.data.uris[uriIndex].pingInterval = pingInterval;
      await db.write();
      console.log(`URI ${id} ping interval set to ${pingInterval} minutes`);
    } else {
      return res.status(400).send('Invalid ping interval (must be between 1 and 60 or null)');
    }

    res.json(db.data.uris[uriIndex]);
  });

  app.use('/api', api);

  // Fallback: serve index.html for any other route (SPA support)
  app.get('*', async (req, res) => {
    const filePath = join(process.cwd(), 'dist', 'index.html');
    try {
      await stat(filePath);
      const contents = await readFile(filePath, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.send(contents);
    } catch (e) {
      res.status(404).send('Not Found');
    }
  });

  // Schedule cron job to check URIs every 5 minutes
  nodeCron.schedule('*/5 * * * *', checkAllURIs);

  // Start the server
  const port = process.env.KEEPALIVE_PORT ? Number(process.env.KEEPALIVE_PORT) : 3001;
  app.listen(port, () => {
    console.log(`KeepAlive app is running at http://localhost:${port}`);
    // Run initial check
    checkAllURIs();
  });
}

main();

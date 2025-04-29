import { Elysia, t } from 'elysia';
import { cron } from '@elysiajs/cron';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { readFile } from 'fs/promises';
import { stat } from 'fs/promises';
import { join } from 'path';

// Define types
export type URI = {
  id: string;
  url: string;
  status: 'up' | 'down' | 'unknown';
  lastChecked: string | null;
  createdAt: string;
  pingInterval?: number; // Optional specific interval for this URI
};

export type DBSchema = {
  uris: URI[];
  settings: {
    pingInterval: number;
  };
};

// Initialize LowDB with path from environment variable or default
const DB_PATH = process.env.DB_PATH || 'db.json';
const adapter = new JSONFile<DBSchema>(DB_PATH);
const db = new Low(adapter, { uris: [], settings: { pingInterval: 5 } });

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
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// Function to ping a URI
export async function pingURI(uri: URI): Promise<'up' | 'down'> {
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
export async function checkAllURIs() {
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

// Create Elysia app with a cron job to check URIs
const app = new Elysia()
  .use(
    cron({
      name: 'checkURIs',
      pattern: '*/5 * * * *', // Every 5 minutes
      run: checkAllURIs
    })
  )
  // Serve static files from public directory
  .get('*', async ({ path }) => {
    if (path === '/') {
      path = '/index.html';
    }

    // Handle platform guide routes
    if (path === '/aws-lambda' || path === '/aws-lambda-guide') {
      path = '/platform/aws-lambda-guide.html';
    } else if (path === '/render' || path === '/render-guide') {
      path = '/platform/render-guide.html';
    } else if (path === '/amplify' || path === '/amplify-guide') {
      path = '/platform/amplify-guide.html';
    } else if (path === '/heroku' || path === '/heroku-guide') {
      path = '/platform/heroku-guide.html';
    } else if (path === '/vercel' || path === '/vercel-guide') {
      path = '/platform/vercel-guide.html';
    } else if (path === '/platform-comparison' || path === '/why') {
      path = '/platform/platform-comparison.html';
    } else if (path === '/journey' || path === '/development-journey') {
      path = '/journey/index.html';
    }

    // Handle static content routes (keeping backward compatibility)
    if (path.startsWith('/img/')) {
      const imgPath = path.replace('/img/', '/static/img/');
      path = imgPath;
    }

    const filePath = join(process.cwd(), 'public', path);

    try {
      // Check if file exists
      await stat(filePath);
      const contents = await readFile(filePath, 'utf-8');

      // Set content type based on file extension
      const extension = path.split('.').pop() || '';
      let contentType = 'text/plain';

      switch (extension) {
        case 'html':
          contentType = 'text/html';
          break;
        case 'css':
          contentType = 'text/css';
          break;
        case 'js':
          contentType = 'application/javascript';
          break;
        case 'json':
          contentType = 'application/json';
          break;
        case 'svg':
          contentType = 'image/svg+xml';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
      }

      return new Response(contents, {
        headers: {
          'Content-Type': contentType
        }
      });
    } catch (e) {
      // If file doesn't exist, try index.html
      if (path !== '/index.html') {
        return app.handle({
          method: 'GET',
          path: '/index.html',
          headers: new Headers()
        });
      }

      // If even index.html doesn't exist, return 404
      return new Response('Not Found', { status: 404 });
    }
  })
  // API endpoints
  .group('/api', app => app
    // Get all URIs
    .get('/uris', () => {
      return db.data?.uris || [];
    })
    // Add a new URI
    .post('/uris', async ({ body }) => {
      const { url } = body as { url: string };

      if (!url || !isValidURL(url)) {
        return new Response('Invalid URL', { status: 400 });
      }

      if (!db.data) return new Response('Database error', { status: 500 });

      // Check if URI already exists
      const existingURI = db.data.uris.find(u => u.url === url);
      if (existingURI) {
        return new Response('URI already exists', { status: 409 });
      }

      const newURI: URI = {
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

      return newURI;
    })
    // Delete a URI
    .delete('/uris/:id', async ({ params }) => {
      const { id } = params;

      if (!db.data) return new Response('Database error', { status: 500 });

      const uriIndex = db.data.uris.findIndex(u => u.id === id);
      if (uriIndex === -1) {
        return new Response('URI not found', { status: 404 });
      }

      db.data.uris.splice(uriIndex, 1);
      await db.write();

      return { success: true };
    })
    // Get the logs
    .get('/logs', async () => {
      try {
        // Get the logs directory
        const logsDir = join(process.cwd(), 'logs');

        // Get the log file
        const logFilePath = join(logsDir, 'wakeup.log');

        // Check if the log file exists
        try {
          await stat(logFilePath);
        } catch {
          return { logs: [] };
        }

        // Read the log file
        const logContents = await readFile(logFilePath, 'utf-8');

        // Split the log file into lines
        const lines = logContents.split('\n').filter(line => line.trim() !== '');

        // Return the last 100 lines
        return { logs: lines.slice(-100) };
      } catch (error) {
        console.error('Error reading logs:', error);
        return { logs: [] };
      }
    })
    // Get settings
    .get('/settings', () => {
      if (!db.data || !db.data.settings) {
        return { pingInterval: 5 };
      }
      return db.data.settings;
    })
    // Update settings
    .post('/settings', async ({ body }) => {
      const { pingInterval } = body as { pingInterval: number };

      if (!db.data) return new Response('Database error', { status: 500 });

      // Validate ping interval
      if (typeof pingInterval !== 'number' || pingInterval < 1 || pingInterval > 60) {
        return new Response('Invalid ping interval (must be between 1 and 60)', { status: 400 });
      }

      db.data.settings.pingInterval = pingInterval;
      await db.write();

      return db.data.settings;
    })
    // Update URI ping interval
    .post('/uris/:id/ping-interval', async ({ params, body }) => {
      const { id } = params;
      const { pingInterval } = body as { pingInterval: number | null };

      if (!db.data) return new Response('Database error', { status: 500 });

      const uriIndex = db.data.uris.findIndex(u => u.id === id);
      if (uriIndex === -1) {
        return new Response('URI not found', { status: 404 });
      }

      // If null, remove custom interval
      if (pingInterval === null) {
        delete db.data.uris[uriIndex].pingInterval;
        await db.write();
        console.log(`URI ${id} ping interval removed, reverting to global setting`);
      }
      // Otherwise set custom interval
      else if (typeof pingInterval === 'number' && pingInterval >= 1 && pingInterval <= 60) {
        db.data.uris[uriIndex].pingInterval = pingInterval;
        await db.write();
        console.log(`URI ${id} ping interval set to ${pingInterval} minutes`);
      }
      // Invalid value
      else {
        return new Response('Invalid ping interval (must be between 1 and 60 or null)', { status: 400 });
      }

      return db.data.uris[uriIndex];
    })
  );

// Start the server when this file is the main module (not imported by tests)
if (!process.env.TESTING) {
  const port = process.env.ELYZIA_PORT ? Number(process.env.ELYZIA_PORT) : 3001;
  app.listen(port);
  console.log(`Elysis scheduler app is running at http://${app.server?.hostname}:${app.server?.port}`);

  // Run initial check
  checkAllURIs();
}

export default app;

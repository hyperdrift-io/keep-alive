import { Elysia, t } from 'elysia';
import { cron } from '@elysiajs/cron';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { readFile } from 'fs/promises';
import { stat } from 'fs/promises';
import { join } from 'path';
import { watchFile } from 'fs';

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

// Keep track of WebSocket connections for live reload
const liveReloadClients = new Set<any>();

// Function to check if a URL is valid
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

// Function to ping a URI and update its status
export async function pingURI(uri: URI): Promise<URI> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(uri.url, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    return {
      ...uri,
      status: response.ok ? 'up' : 'down',
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      ...uri,
      status: 'down',
      lastChecked: new Date().toISOString()
    };
  }
}

// Function to check all URIs
export async function checkAllURIs() {
  console.log('Checking all URIs...');
  const { uris } = db.data;
  const globalInterval = db.data.settings.pingInterval;

  const currentMinute = new Date().getMinutes();

  // Filter URIs based on their individual interval settings or the global setting
  const urisToCheck = uris.filter(uri => {
    // If URI has a specific interval setting, use that
    const interval = uri.pingInterval || globalInterval;

    if (interval === 1) {
      // Check every minute
      return true;
    } else if (interval === 5) {
      // Check every 5 minutes
      return currentMinute % 5 === 0;
    } else if (interval === 10) {
      // Check every 10 minutes
      return currentMinute % 10 === 0;
    }

    return true; // Default to checking if interval is not recognized
  });

  console.log(`Checking ${urisToCheck.length} of ${uris.length} URIs based on interval settings...`);

  // Only update the URIs that were checked
  if (urisToCheck.length > 0) {
    const updatedUris = await Promise.all(
      urisToCheck.map(uri => pingURI(uri))
    );

    // Merge the updated URIs back into the original list
    updatedUris.forEach(updatedUri => {
      const index = db.data.uris.findIndex(uri => uri.id === updatedUri.id);
      if (index !== -1) {
        db.data.uris[index] = updatedUri;
      }
    });

    await db.write();
  }

  console.log('URI checks completed');
}

// Create a new Elysia application with cron job to check URIs every minute
export const app = new Elysia()
  .onError(({ code, error, set }) => {
    console.error(`Error [${code}]:`, error);

    switch (code) {
      case 'NOT_FOUND':
        set.status = 404;
        return { error: 'Resource not found' };

      case 'VALIDATION':
        set.status = 400;
        return { error: 'Invalid input', details: error.message };

      case 'PARSE':
        set.status = 400;
        return { error: 'Invalid request data' };

      default:
        set.status = 500;
        return { error: 'Internal server error' };
    }
  })
  .use(
    cron({
      name: 'check-uris',
      pattern: '* * * * *', // Run every minute to handle all interval types
      async run() {
        // Skip execution in testing environment
        if (process.env.TESTING) return;

        console.log('Running scheduled check of URIs...');
        await checkAllURIs();
      }
    })
  )
  // Serve static files
  .get('/', async () => {
    return new Response(await readFile('./public/index.html'), {
      headers: { 'Content-Type': 'text/html' },
    });
  })
  .get('/style.css', async () => {
    const cssContent = await readFile('./public/style.css');
    return new Response(cssContent, {
      headers: { 'Content-Type': 'text/css' },
    });
  })
  .get('/app.js', async () => {
    const jsContent = await readFile('./public/app.js');
    return new Response(jsContent, {
      headers: { 'Content-Type': 'application/javascript' },
    });
  })
  // API endpoints with validation
  .get('/api/uris', () => {
    return db.data.uris;
  })
  .post('/api/uris',
    ({ body, set }) => {
      const { url } = body as { url: string };

      // Validate URL and check for duplicates in one pass
      if (!isValidURL(url)) {
        set.status = 400;
        return { error: 'Invalid URL format' };
      }

      if (db.data.uris.some(uri => uri.url === url)) {
        set.status = 400;
        return { error: 'This URL already exists' };
      }

      const newURI: URI = {
        id: crypto.randomUUID(),
        url,
        status: 'unknown',
        lastChecked: null,
        createdAt: new Date().toISOString()
      };

      db.data.uris.push(newURI);
      db.write();

      // Immediately check the new URI
      return pingURI(newURI).then(checkedURI => {
        const index = db.data.uris.findIndex(u => u.id === newURI.id);
        if (index !== -1) {
          db.data.uris[index] = checkedURI;
          db.write();
        }
        return checkedURI;
      });
    },
    {
      body: t.Object({
        url: t.String()
      })
    }
  )
  .delete('/api/uris/:id', ({ params, set }) => {
    const { id } = params;
    const initialLength = db.data.uris.length;

    db.data.uris = db.data.uris.filter(uri => uri.id !== id);

    if (db.data.uris.length === initialLength) {
      set.status = 404;
      return { error: 'URI not found' };
    }

    db.write();
    return { success: true };
  })
  .put('/api/uris/:id',
    async ({ params, body, set }) => {
      const { id } = params;
      const { url } = body as { url: string };

      if (!url || !isValidURL(url)) {
        set.status = 400;
        return { error: 'Invalid URL provided' };
      }

      const uriIndex = db.data.uris.findIndex(uri => uri.id === id);

      if (uriIndex === -1) {
        set.status = 404;
        return { error: 'URI not found' };
      }

      db.data.uris[uriIndex].url = url;
      db.data.uris[uriIndex].status = 'unknown';
      db.data.uris[uriIndex].lastChecked = null;

      await db.write();

      // Immediately check the updated URI
      const checkedURI = await pingURI(db.data.uris[uriIndex]);
      db.data.uris[uriIndex] = checkedURI;
      await db.write();

      return checkedURI;
    },
    {
      body: t.Object({
        url: t.String()
      })
    }
  )
  // PM2 logs endpoint
  .get('/api/logs', async () => {
    const pmLogPath = join(process.cwd(), 'logs', 'pm2.log');

    try {
      await stat(pmLogPath);
    } catch {
      return { logs: [] };
    }

    const logContent = await readFile(pmLogPath, 'utf-8');
    const logs = logContent.split('\n').filter(Boolean).slice(-50);

    return { logs };
  })
  // Settings endpoint
  .get('/api/settings', () => {
    return db.data.settings;
  })
  .post('/api/settings',
    async ({ body, set }) => {
      const { pingInterval } = body as { pingInterval: number };

      if (typeof pingInterval !== 'number' || ![1, 5, 10].includes(pingInterval)) {
        set.status = 400;
        return { error: 'Invalid ping interval. Must be 1, 5, or 10 minutes.' };
      }

      db.data.settings.pingInterval = pingInterval;
      await db.write();

      console.log(`Ping interval updated to ${pingInterval} minutes`);
      return db.data.settings;
    },
    {
      body: t.Object({
        pingInterval: t.Number()
      })
    }
  )
  // Add endpoints for URI-specific interval settings
  .post('/api/uris/:id/interval',
    async ({ params, body, set }) => {
      const { id } = params;
      const { pingInterval } = body as { pingInterval: number };

      // Validate interval
      if (typeof pingInterval !== 'number' || ![1, 5, 10].includes(pingInterval)) {
        set.status = 400;
        return { error: 'Invalid ping interval. Must be 1, 5, or 10 minutes.' };
      }

      // Find the URI
      const uriIndex = db.data.uris.findIndex(uri => uri.id === id);
      if (uriIndex === -1) {
        set.status = 404;
        return { error: 'URI not found' };
      }

      // Update the URI with the specific interval
      db.data.uris[uriIndex].pingInterval = pingInterval;
      await db.write();

      console.log(`URI ${id} ping interval set to ${pingInterval} minutes`);
      return db.data.uris[uriIndex];
    },
    {
      body: t.Object({
        pingInterval: t.Number()
      })
    }
  )
  .delete('/api/uris/:id/interval', async ({ params, set }) => {
    const { id } = params;

    // Find the URI
    const uriIndex = db.data.uris.findIndex(uri => uri.id === id);
    if (uriIndex === -1) {
      set.status = 404;
      return { error: 'URI not found' };
    }

    // Remove the specific interval setting
    if (db.data.uris[uriIndex].pingInterval !== undefined) {
      delete db.data.uris[uriIndex].pingInterval;
      await db.write();
      console.log(`URI ${id} ping interval removed, reverting to global setting`);
    }

    return db.data.uris[uriIndex];
  })
  // WebSocket endpoint for live reload in development mode
  .ws('/livereload', {
    open(ws) {
      console.log('Live reload client connected');
      liveReloadClients.add(ws);
    },
    close(ws) {
      console.log('Live reload client disconnected');
      liveReloadClients.delete(ws);
    },
    message(ws, message) {
      console.log('Received message from live reload client:', message);
    }
  });

// Start the server when this file is the main module (not imported by tests)
if (!process.env.TESTING) {
  app.listen(3001);
  console.log(`WakeUp app is running at http://${app.server?.hostname}:${app.server?.port}`);

  // Run initial check
  checkAllURIs();

  // Set up file watching for live reload in development mode
  // Only watch if not in production mode (we'll check for a specific env var)
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    console.log('Setting up live reload for development mode');

    // Files to watch for changes
    const filesToWatch = [
      './public/index.html',
      './public/style.css',
      './public/app.js',
      './index.ts'
    ];

    filesToWatch.forEach(file => {
      watchFile(file, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          console.log(`File ${file} changed, notifying clients`);

          // Notify all connected WebSocket clients to reload
          liveReloadClients.forEach(client => {
            if (client.readyState === 1) { // OPEN
              client.send('reload');
            }
          });
        }
      });
    });
  }
}

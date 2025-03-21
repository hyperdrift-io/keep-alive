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
};

export type DBSchema = {
  uris: URI[];
};

// Initialize LowDB with path from environment variable or default
const DB_PATH = process.env.DB_PATH || 'db.json';
const adapter = new JSONFile<DBSchema>(DB_PATH);
const db = new Low(adapter, { uris: [] });

// Load database
await db.read();

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

  const updatedUris = await Promise.all(
    uris.map(uri => pingURI(uri))
  );

  db.data.uris = updatedUris;
  await db.write();
  console.log('URI checks completed');
}

// Initialize app with cron job for URI pinging and error handling
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
      pattern: '*/5 * * * *', // Every 5 minutes
      run: checkAllURIs
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
  });

// Start the server when this file is the main module (not imported by tests)
if (!process.env.TESTING) {
  app.listen(3001);
  console.log(`WakeUp app is running at http://${app.server?.hostname}:${app.server?.port}`);

  // Run initial check
  checkAllURIs();
}

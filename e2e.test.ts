import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { execSync } from 'child_process';
import { unlinkSync, existsSync } from 'fs';

const SERVER_URL = 'http://localhost:3001';
const TEST_DB_PATH = 'test-db.json';

// Helper function to wait for server to start
const waitForServer = async (url: string, retries = 10, delay = 500): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return false;
};

describe('End-to-End Tests', () => {
  let serverProcess: any;

  beforeAll(async () => {
    // Create test database file
    Bun.write(TEST_DB_PATH, JSON.stringify({ uris: [] }));

    // Start server in a separate process
    serverProcess = Bun.spawn(['bun', 'run', 'index.ts'], {
      env: { ...process.env, DB_PATH: TEST_DB_PATH },
      stdout: 'inherit',
      stderr: 'inherit'
    });

    // Wait for server to be ready
    const isReady = await waitForServer(SERVER_URL);
    if (!isReady) {
      throw new Error('Server failed to start');
    }
  });

  afterAll(() => {
    // Kill server process
    serverProcess?.kill();

    // Delete test database
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  it('should load the frontend page', async () => {
    const response = await fetch(SERVER_URL);
    expect(response.status).toBe(200);

    const html = await response.text();
    expect(html).toContain('<title>WakeUp - URI Monitor</title>');
  });

  it('should serve the CSS file', async () => {
    const response = await fetch(`${SERVER_URL}/style.css`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/css');
  });

  it('should serve the JS file', async () => {
    const response = await fetch(`${SERVER_URL}/app.js`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('javascript');
  });

  it('should have a list of URIs', async () => {
    const response = await fetch(`${SERVER_URL}/api/uris`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should add a valid URI', async () => {
    const response = await fetch(`${SERVER_URL}/api/uris`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://example.com'
      })
    });

    expect(response.status).toBe(200);

    const uri = await response.json();
    expect(uri.url).toBe('https://example.com');
    expect(uri.id).toBeDefined();
  });

  it('should list the added URI', async () => {
    // Wait a moment to ensure the URI has been processed
    await new Promise(resolve => setTimeout(resolve, 500));

    const response = await fetch(`${SERVER_URL}/api/uris`);
    expect(response.status).toBe(200);

    const uris = await response.json();
    expect(uris.length).toBeGreaterThan(0);
    expect(uris.some((uri: any) => uri.url === 'https://example.com')).toBe(true);
  });

  it('should reject invalid URIs', async () => {
    const response = await fetch(`${SERVER_URL}/api/uris`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'not-a-valid-url'
      })
    });

    expect(response.status).toBe(400);
  });

  it('should delete a URI', async () => {
    // First get the list to find a URI to delete
    const listResponse = await fetch(`${SERVER_URL}/api/uris`);
    const uris = await listResponse.json();

    if (uris.length === 0) {
      // Skip if no URIs to delete
      return;
    }

    const uriToDelete = uris[0];

    const deleteResponse = await fetch(`${SERVER_URL}/api/uris/${uriToDelete.id}`, {
      method: 'DELETE'
    });

    expect(deleteResponse.status).toBe(200);

    // Verify it was deleted
    const verifyResponse = await fetch(`${SERVER_URL}/api/uris`);
    const updatedUris = await verifyResponse.json();

    expect(updatedUris.every((uri: any) => uri.id !== uriToDelete.id)).toBe(true);
  });
});

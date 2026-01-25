import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function waitForServer(child, port) {
  const baseUrl = `http://localhost:${port}`;
  const deadline = Date.now() + 10000;
  let lastError;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early with code ${child.exitCode}`);
    }

    try {
      const res = await fetch(`${baseUrl}/api/uris`);
      if (res.ok) {
        return baseUrl;
      }
      lastError = new Error(`Unexpected status: ${res.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(200);
  }

  const message = lastError ? lastError.message : 'unknown error';
  throw new Error(`Server did not become ready: ${message}`);
}

async function startServer() {
  const port = await getAvailablePort();
  const dbPath = join(tmpdir(), `keepalive-test-${randomUUID()}.json`);

  const child = spawn(process.execPath, ['index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      KEEPALIVE_PORT: String(port),
      DB_PATH: dbPath,
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const baseUrl = await waitForServer(child, port);
  return { child, baseUrl, dbPath };
}

async function stopServer(child) {
  if (child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');
  const result = await Promise.race([once(child, 'exit'), delay(2000)]);

  if (result === undefined) {
    child.kill('SIGKILL');
    await once(child, 'exit');
  }
}

test('server starts and APIs respond', async () => {
  const { child, baseUrl, dbPath } = await startServer();

  try {
    const res = await fetch(`${baseUrl}/api/uris`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.equal(data.length, 0);

    const invalidRes = await fetch(`${baseUrl}/api/uris`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-url' })
    });
    assert.equal(invalidRes.status, 400);
  } finally {
    await stopServer(child);
    await rm(dbPath, { force: true });
  }
});

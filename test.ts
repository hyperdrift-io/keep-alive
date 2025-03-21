import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test';
import { Elysia } from 'elysia';
import fs from 'fs';

// Set TESTING environment variable
process.env.TESTING = 'true';

// Mock fetch for URI checks
global.fetch = mock(async (url) => {
  // Mock different responses based on URL
  if (url.toString().includes('success.com')) {
    return new Response('OK', { status: 200 });
  } else if (url.toString().includes('notfound.com')) {
    return new Response('Not Found', { status: 404 });
  } else if (url.toString().includes('error.com')) {
    throw new Error('Network error');
  }
  return new Response('OK', { status: 200 });
});

// Import directly from index.ts now that we've exported the functions
import { app, isValidURL, pingURI, URI } from './index';

describe('WakeUp App Tests', () => {
  describe('URL Validation', () => {
    it('should validate correct URLs', () => {
      expect(isValidURL('https://example.com')).toBe(true);
      expect(isValidURL('http://localhost:3000')).toBe(true);
      expect(isValidURL('https://sub.domain.com/path?query=value')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidURL('')).toBe(false);
      expect(isValidURL('not-a-url')).toBe(false);
      expect(isValidURL('http://')).toBe(false);
    });
  });

  describe('URI Ping Function', () => {
    it('should handle successful responses', async () => {
      const uri: URI = {
        id: '1',
        url: 'https://success.com',
        status: 'unknown',
        lastChecked: null,
        createdAt: new Date().toISOString()
      };

      const result = await pingURI(uri);

      expect(result.status).toBe('up');
      expect(result.lastChecked).not.toBeNull();
    });

    it('should handle error responses', async () => {
      const uri: URI = {
        id: '2',
        url: 'https://notfound.com',
        status: 'unknown',
        lastChecked: null,
        createdAt: new Date().toISOString()
      };

      const result = await pingURI(uri);

      expect(result.status).toBe('down');
      expect(result.lastChecked).not.toBeNull();
    });

    it('should handle network errors', async () => {
      const uri: URI = {
        id: '3',
        url: 'https://error.com',
        status: 'unknown',
        lastChecked: null,
        createdAt: new Date().toISOString()
      };

      const result = await pingURI(uri);

      expect(result.status).toBe('down');
      expect(result.lastChecked).not.toBeNull();
    });
  });

  describe('API Endpoints', () => {
    // Test instance of the app
    let testApp: any;

    beforeAll(() => {
      // Create a test instance with our app - cast to any to avoid type issues
      testApp = app;
    });

    it('should return URIs list', async () => {
      const response = await testApp.handle(
        new Request('http://localhost/api/uris')
      );

      const result = await response.json();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should add a new URI', async () => {
      const response = await testApp.handle(
        new Request('http://localhost/api/uris', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: 'https://example.com'
          })
        })
      );

      const result = await response.json();
      expect(result.url).toBe('https://example.com');
      expect(result.id).toBeDefined();
    });

    it('should reject invalid URLs', async () => {
      const response = await testApp.handle(
        new Request('http://localhost/api/uris', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: 'not-a-valid-url'
          })
        })
      );

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBeDefined();
    });
  });
});

// Clean up test file
afterAll(() => {
  if (fs.existsSync(testModulePath)) {
    fs.unlinkSync(testModulePath);
  }
});

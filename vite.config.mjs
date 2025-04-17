import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import htmlMinify from 'vite-plugin-html-minify';

// Find all HTML files in public/
const htmlFiles = fs.readdirSync('./public').filter(f => f.endsWith('.html'));
const input = Object.fromEntries(htmlFiles.map(f => [f.replace('.html', ''), resolve('./public', f)]));

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input,
    },
    minify: true,
  },
  publicDir: 'public',
  plugins: [htmlMinify()],
});

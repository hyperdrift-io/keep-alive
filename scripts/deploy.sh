#!/bin/bash
set -e

# Navigate to app directory
cd ~/hyperdrift/keep-alive

# Install Bun if not already installed
if ! command -v bun &>/dev/null; then
  echo "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  echo 'export BUN_INSTALL="$HOME/.bun"' >>~/.bashrc
  echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >>~/.bashrc
  source ~/.bashrc
fi

# Verify Bun is installed
echo "Bun version:"
bun --version || echo "Bun not found"

# Create logs directory if it doesn't exist
mkdir -p logs

# Install dependencies
echo "Installing dependencies..."
bun install

# Install Node.js if needed
if ! command -v node &>/dev/null; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Install PM2 if needed
if ! command -v pm2 &>/dev/null; then
  echo "Installing PM2..."
  npm install -g pm2
fi

# Build the frontend with Vite (minified)
echo "Building frontend with Vite..."
bun run build

# Build the backend (transpile index.ts to dist/index.js for Node.js)
echo "Building backend for production..."
bun build index.ts --outdir dist --target node

# Start/Restart the Elysia API app with PM2 (using Node.js, no Bun static server)
if [ -f ecosystem.config.cjs ]; then
  echo "Using ecosystem.config.cjs with PM2"
  if pm2 list | grep -q "keepalive"; then
    echo "Restarting existing app with PM2"
    pm2 restart keepalive
  else
    echo "Starting new app with PM2"
    pm2 start ecosystem.config.cjs
  fi
else
  echo "ecosystem.config.cjs not found, starting Elysia API app with PM2 directly"
  if pm2 list | grep -q "keep-alive"; then
    echo "Restarting existing app with PM2"
    pm2 restart keep-alive
  else
    echo "Starting new app with PM2"
    pm2 start "NODE_ENV=production KEEPALIVE_PORT=3001 node dist/index.js" --name keep-alive
  fi
fi

# Save PM2 configuration to start on system boot
pm2 save

# If using ecosystem.config.cjs, ensure NODE_ENV is set to 'production' and KEEPALIVE_PORT to '3001' in the config for production deployments.

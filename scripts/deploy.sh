#!/bin/bash
set -e

# Navigate to app directory, creating it if needed
mkdir -p ~/hyperdrift/keepalive
cd ~/hyperdrift/keepalive

# The git pull is no longer needed since we're copying files directly in the GitHub action
# but keeping it as a fallback
if [ ! -f package.json ]; then
  echo "package.json not found, falling back to git clone"
  # Pull latest changes or clone repo if not exists
  if [ -d .git ]; then
    git pull
  else
    git clone https://github.com/yannvr/keep-alive.git .
  fi
fi

# Install Bun if not already installed
if ! command -v bun &> /dev/null; then
  echo "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
  echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
  source ~/.bashrc
fi

# Verify Bun is installed
echo "Bun version:"
command -v bun || echo "Bun not found in PATH"
~/.bun/bin/bun --version || echo "Bun executable not found"

# Create logs directory if it doesn't exist
mkdir -p logs

# Install dependencies using absolute path to bun
echo "Installing dependencies..."
~/.bun/bin/bun install

# Print installed packages for debugging
echo "Installed packages:"
~/.bun/bin/bun pm ls

# Install Node.js if needed
if ! command -v node &> /dev/null; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Install PM2 if needed
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2..."
  npm install -g pm2
fi

# Build the frontend with Vite (minified)
echo "Building frontend with Vite..."
bun run build

echo "Deploying files..."
# (Add your deployment logic here, e.g., rsync, scp, etc.)

# Start/Restart the app with PM2
if [ -f ecosystem.config.cjs ]; then
  echo "Using ecosystem.config.cjs with PM2"
  # Check if the app is already running
  if pm2 list | grep -q "keepalive"; then
    echo "Restarting existing app with PM2"
    pm2 restart keepalive
  else
    echo "Starting new app with PM2"
    pm2 start ecosystem.config.cjs
  fi
else
  echo "ecosystem.config.cjs not found, starting app with PM2 directly"
  # Check if the app is already running
  if pm2 list | grep -q "keep-alive"; then
    echo "Restarting existing app with PM2"
    pm2 restart keep-alive
  else
    echo "Starting new app with PM2"
    pm2 start "~/.bun/bin/bun run index.ts" --name keep-alive
  fi
fi

# Save PM2 configuration to start on system boot
pm2 save

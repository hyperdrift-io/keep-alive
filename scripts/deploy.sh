#!/bin/bash
set -e

# Navigate to app directory, creating it if needed
mkdir -p ~/hyperdrift/wakeup
cd ~/hyperdrift/wakeup

# Pull latest changes or clone repo if not exists
if [ -d .git ]; then
  git pull
else
  git clone https://github.com/yannvr/wakeup.git .
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
~/.bun/bin/bun install

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

# Start/Restart the app with PM2
pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs

# Save PM2 configuration to start on system boot
pm2 save

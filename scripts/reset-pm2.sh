#!/bin/bash

# Stop and delete all processes
pm2 delete all

# Kill the PM2 daemon
pm2 kill

# Clear dump file
pm2 cleardump

# Start the application again
cd ~/hyperdrift/wakeup
pm2 start ecosystem.config.cjs

# Save current process list
pm2 save

echo "PM2 has been reset and the application has been restarted."

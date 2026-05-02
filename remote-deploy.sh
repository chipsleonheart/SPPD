#!/bin/bash
# SPPD Remote Deployment Script

APP_DIR="/var/www/sppd"
echo "Starting remote deployment in $APP_DIR..."

mkdir -p "$APP_DIR"
cd "$APP_DIR" || { echo "Failed to enter $APP_DIR"; exit 1; }

# Extract new files
echo "Extracting files..."
rm -rf dist # Clean old dist to avoid lingering files with different hashes
tar -xzf ~/deploy.tar.gz

# Install production dependencies
echo "Installing dependencies..."
npm install --production --omit=dev

# Setup Database
echo "Updating database schema..."
cp prisma/schema.prisma.prod prisma/schema.prisma
npx prisma generate
npx prisma db push --skip-generate

# Restart Server
echo "Restarting application..."
PM2_PATH=$(command -v pm2 || echo "/usr/local/bin/pm2")
if [ -x "$PM2_PATH" ]; then
    $PM2_PATH delete sppd-app || true # Ensure we start fresh
    $PM2_PATH start server.prod.js --name sppd-app --update-env
else
    echo "PM2 not found, using raw node (manual)"
    pkill -f server.prod.js
    nohup node server.prod.js > app.log 2>&1 &
fi

echo "Deployment completed successfully!"

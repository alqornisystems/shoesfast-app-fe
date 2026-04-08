#!/bin/bash

# Script untuk prepare production build
# Usage: ./deploy-prepare.sh

set -e

echo "🚀 Preparing production build..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build
echo -e "${YELLOW}📦 Building Next.js...${NC}"
npm run build

# Step 2: Create deploy directory
echo -e "${YELLOW}📁 Creating deploy directory...${NC}"
DEPLOY_DIR="deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Step 3: Copy standalone build
echo -e "${YELLOW}📋 Copying standalone build...${NC}"
cp -r .next/standalone/Websites/app-shoesfast/app-new/frontend/* "$DEPLOY_DIR/"

# Step 4: Copy static files
echo -e "${YELLOW}🎨 Copying static files...${NC}"
mkdir -p "$DEPLOY_DIR/.next"
cp -r .next/static "$DEPLOY_DIR/.next/"

# Step 5: Copy public folder
echo -e "${YELLOW}🖼️  Copying public folder...${NC}"
if [ -d "public" ]; then
  cp -r public "$DEPLOY_DIR/"
fi

# Step 6: Create .env.production template
echo -e "${YELLOW}⚙️  Creating environment template...${NC}"
cat > "$DEPLOY_DIR/.env.production" <<EOL
# Production Environment Variables
# Edit these values according to your server configuration

NEXT_PUBLIC_API_URL=http://localhost:8000
NODE_ENV=production
PORT=3000
EOL

# Step 7: Create start script
echo -e "${YELLOW}🔧 Creating start script...${NC}"
cat > "$DEPLOY_DIR/start.sh" <<'EOL'
#!/bin/bash
# Start script for production

# Load environment variables
if [ -f .env.production ]; then
  export $(cat .env.production | grep -v '^#' | xargs)
fi

# Start server
node server.js
EOL
chmod +x "$DEPLOY_DIR/start.sh"

# Step 8: Create PM2 ecosystem file
echo -e "${YELLOW}🔧 Creating PM2 config...${NC}"
cat > "$DEPLOY_DIR/ecosystem.config.js" <<'EOL'
module.exports = {
  apps: [{
    name: 'shoesfast-frontend',
    script: './server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '500M',
    watch: false
  }]
}
EOL

# Step 9: Create logs directory
mkdir -p "$DEPLOY_DIR/logs"

# Step 10: Create README for deployment
cat > "$DEPLOY_DIR/README.txt" <<EOL
===========================================
Shoesfast Frontend - Production Build
Generated: $(date)
===========================================

DEPLOYMENT STEPS:
-----------------

1. Upload this entire folder to your server
   Example: scp -r $DEPLOY_DIR user@server:/var/www/shoesfast-frontend

2. Edit .env.production on the server with correct values
   nano .env.production

3. Start the application:

   Option A - Direct:
   ./start.sh

   Option B - With PM2 (Recommended):
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup

4. Setup Nginx reverse proxy (optional but recommended)
   See DEPLOY.md for Nginx configuration

VERIFY DEPLOYMENT:
------------------
curl http://localhost:3000

MONITORING:
-----------
pm2 logs shoesfast-frontend
pm2 monit

STOP/RESTART:
-------------
pm2 stop shoesfast-frontend
pm2 restart shoesfast-frontend
pm2 reload shoesfast-frontend  # zero-downtime restart

For detailed instructions, see DEPLOY.md
EOL

# Step 11: Create archive
echo -e "${YELLOW}📦 Creating archive...${NC}"
tar -czf "$DEPLOY_DIR.tar.gz" "$DEPLOY_DIR"

# Done!
echo -e "${GREEN}✅ Build preparation complete!${NC}"
echo ""
echo "📁 Deploy folder: $DEPLOY_DIR"
echo "📦 Archive: $DEPLOY_DIR.tar.gz"
echo ""
echo "Next steps:"
echo "1. Upload $DEPLOY_DIR.tar.gz to your server"
echo "2. Extract: tar -xzf $DEPLOY_DIR.tar.gz"
echo "3. Follow instructions in $DEPLOY_DIR/README.txt"
echo ""
echo "Quick deploy command:"
echo "  scp $DEPLOY_DIR.tar.gz user@server:/tmp/"
echo "  ssh user@server 'cd /var/www && tar -xzf /tmp/$DEPLOY_DIR.tar.gz && cd $DEPLOY_DIR && pm2 start ecosystem.config.js'"

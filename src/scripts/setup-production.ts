#!/usr/bin/env tsx

import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setupProduction() {
  console.log('🚀 Setting Up Production Configuration');
  console.log('=====================================');
  
  try {
    // 1. Check database health
    console.log('\n📊 Checking Database Health...');
    const { data: cardCount, error: cardError } = await supabase
      .from('cards')
      .select('card_id', { count: 'exact' });
    
    if (cardError) throw cardError;
    console.log(`✅ Database: ${cardCount?.length || 0} cards available`);
    
    // 2. Check price history data
    const { data: priceCount, error: priceError } = await supabase
      .from('price_history')
      .select('set_id', { count: 'exact' });
    
    if (priceError) throw priceError;
    console.log(`✅ Price History: ${priceCount?.length || 0} records available`);
    
    // 3. Check available sets
    const { data: sets, error: setsError } = await supabase
      .from('v_cards_latest')
      .select('set_id, set_name')
      .limit(10);
    
    if (setsError) throw setsError;
    const uniqueSets = [...new Set(sets?.map(s => s.set_id))];
    console.log(`✅ Available Sets: ${uniqueSets.length} sets`);
    uniqueSets.slice(0, 5).forEach(setId => {
      console.log(`   - ${setId}`);
    });
    
    // 4. Create production environment file
    console.log('\n🔧 Creating Production Environment...');
    
    const productionEnv = `# Production Environment Configuration
# Generated on ${new Date().toISOString()}

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY}

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Pokemon Card Tracker
NEXT_PUBLIC_APP_VERSION=1.0.0

# Data Sources (Optional - for future real API integration)
# EBAY_APP_ID=your_ebay_app_id
# PPT_API_KEY=your_ppt_api_key

# Performance Settings
NEXT_PUBLIC_MAX_CARDS_PER_PAGE=50
NEXT_PUBLIC_CACHE_TTL=3600
NEXT_PUBLIC_RATE_LIMIT=100

# Analytics (Optional)
# NEXT_PUBLIC_GA_ID=your_google_analytics_id
# NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
`;

    const fs = require('fs');
    fs.writeFileSync('.env.production', productionEnv);
    console.log('✅ Created .env.production file');
    
    // 5. Create production build script
    const buildScript = `#!/bin/bash

# Production Build Script
echo "🚀 Building Pokemon Card Tracker for Production"
echo "=============================================="

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build the application
echo "🔨 Building application..."
npm run build

# Check build output
if [ -d "out" ]; then
    echo "✅ Build successful! Output in 'out' directory"
    echo "📊 Build size:"
    du -sh out/
else
    echo "❌ Build failed - no output directory found"
    exit 1
fi

echo "🎉 Production build complete!"
echo "📋 Next steps:"
echo "1. Deploy to your hosting platform (Vercel, Netlify, etc.)"
echo "2. Set environment variables in your hosting platform"
echo "3. Configure custom domain if needed"
echo "4. Set up monitoring and analytics"
`;

    fs.writeFileSync('build-production.sh', buildScript);
    fs.chmodSync('build-production.sh', '755');
    console.log('✅ Created build-production.sh script');
    
    // 6. Create deployment configuration
    const vercelConfig = `{
  "version": 2,
  "name": "pokemon-card-tracker",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}`;

    fs.writeFileSync('vercel.json', vercelConfig);
    console.log('✅ Created vercel.json configuration');
    
    // 7. Create monitoring script
    const monitoringScript = `#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function healthCheck() {
  console.log('🏥 Production Health Check');
  console.log('==========================');
  
  try {
    // Check database connectivity
    const { data, error } = await supabase
      .from('cards')
      .select('card_id')
      .limit(1);
    
    if (error) {
      console.log('❌ Database: Connection failed');
      console.log('Error:', error.message);
      return false;
    }
    
    console.log('✅ Database: Connected');
    
    // Check price data availability
    const { data: priceData, error: priceError } = await supabase
      .from('price_history')
      .select('set_id')
      .limit(1);
    
    if (priceError) {
      console.log('❌ Price Data: Not available');
      return false;
    }
    
    console.log('✅ Price Data: Available');
    
    // Check recent data freshness
    const { data: recentData, error: recentError } = await supabase
      .from('price_history')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);
    
    if (recentError) {
      console.log('⚠️  Recent Data: Unable to check');
    } else if (recentData && recentData.length > 0) {
      const lastUpdate = new Date(recentData[0].date);
      const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      console.log(\`✅ Recent Data: Last update \${daysSinceUpdate} days ago\`);
      
      if (daysSinceUpdate > 7) {
        console.log('⚠️  Warning: Data is more than 7 days old');
      }
    }
    
    console.log('\\n🎉 All systems operational!');
    return true;
    
  } catch (error) {
    console.log('❌ Health check failed:', error);
    return false;
  }
}

healthCheck().catch(console.error);
`;

    fs.writeFileSync('src/scripts/health-check.ts', monitoringScript);
    console.log('✅ Created health-check.ts script');
    
    // 8. Create package.json production scripts
    const packageJson = require('../../package.json');
    packageJson.scripts = {
      ...packageJson.scripts,
      'build:prod': 'NODE_ENV=production npm run build',
      'start:prod': 'NODE_ENV=production npm start',
      'health:check': 'tsx src/scripts/health-check.ts',
      'deploy:vercel': 'vercel --prod',
      'deploy:netlify': 'netlify deploy --prod'
    };
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated package.json with production scripts');
    
    console.log('\n🎉 Production Setup Complete!');
    console.log('==============================');
    console.log('📋 What was created:');
    console.log('1. .env.production - Production environment variables');
    console.log('2. build-production.sh - Production build script');
    console.log('3. vercel.json - Vercel deployment configuration');
    console.log('4. src/scripts/health-check.ts - Health monitoring');
    console.log('5. Updated package.json with production scripts');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Run: chmod +x build-production.sh');
    console.log('2. Run: ./build-production.sh');
    console.log('3. Deploy to Vercel: npm run deploy:vercel');
    console.log('4. Set up monitoring: npm run health:check');
    console.log('5. Configure custom domain in your hosting platform');
    
  } catch (error) {
    console.error('❌ Production setup failed:', error);
  }
}

setupProduction().catch(console.error);

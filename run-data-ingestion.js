#!/usr/bin/env node

/**
 * Simple script to run Celebrations data ingestion
 * This script can be run without environment variables for testing
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Celebrations data ingestion...');
console.log('=' .repeat(50));

try {
  // Check if we're in the right directory
  const packageJson = require('./package.json');
  if (!packageJson.name) {
    throw new Error('Please run this script from the project root directory');
  }

  // Run the TypeScript script
  console.log('📦 Running data ingestion script...');
  execSync('npx tsx src/scripts/setup-celebrations-data.ts', {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('\n🎉 Data ingestion completed successfully!');
  console.log('You can now refresh the analysis page to see the real Celebrations data!');
  
} catch (error) {
  console.error('\n❌ Data ingestion failed:', error.message);
  console.log('\nTroubleshooting:');
  console.log('1. Make sure you have environment variables set up (.env.local)');
  console.log('2. Make sure your Supabase database is set up');
  console.log('3. Check that the Pokemon TCG API is accessible');
  console.log('4. Run: npm install to ensure all dependencies are installed');
  process.exit(1);
}

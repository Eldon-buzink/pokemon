#!/bin/bash

# Automated eBay integration script
# This script will try to run eBay integration and handle rate limits gracefully

echo "🤖 Automated eBay Integration Script"
echo "====================================="

# Check if we should wait for rate limit reset
current_hour=$(date +%H)
if [ $current_hour -lt 8 ]; then
    echo "⏰ It's early morning - rate limits should be reset!"
    echo "🚀 Running eBay integration..."
    
    # Try small test first
    echo "📊 Running small test (50 calls)..."
    npm run ebay:test
    
    if [ $? -eq 0 ]; then
        echo "✅ Small test successful! Running full set..."
        npm run ebay:robust -- --set cel25c --window 7 --budget 200 --resume
    else
        echo "❌ Small test failed - rate limits still active"
        echo "💡 Try again in a few hours"
    fi
else
    echo "⏰ It's not early morning - rate limits might still be active"
    echo "🔍 Checking if we can make a single call..."
    
    # Try a single diagnostic call
    npx tsx src/scripts/diagnose-ebay.ts
    
    if [ $? -eq 0 ]; then
        echo "✅ API is working! Running small test..."
        npm run ebay:test
    else
        echo "❌ Rate limits still active"
        echo "💡 Try again tomorrow morning (after midnight Pacific)"
    fi
fi

echo "🎉 Script completed!"

#!/bin/bash

# Full Data Pipeline for Pokemon Card Pricing
# This script will systematically collect all pricing data

echo "🚀 Pokemon Card Pricing Data Pipeline"
echo "====================================="
echo "Target: 1,000 cards from Celebrations to Mega Evolutions"
echo "Timeline: 2-3 days for complete data"
echo ""

# Function to check if we should run (avoid rate limits)
check_timing() {
    current_hour=$(date +%H)
    if [ $current_hour -ge 8 ] && [ $current_hour -le 22 ]; then
        echo "⏰ Good time to run (business hours)"
        return 0
    else
        echo "⏰ Late night/early morning - rate limits should be reset"
        return 0
    fi
}

# Function to run with error handling
run_with_retry() {
    local command="$1"
    local description="$2"
    local max_retries=3
    local retry=0
    
    while [ $retry -lt $max_retries ]; do
        echo "🔄 $description (attempt $((retry + 1))/$max_retries)"
        eval $command
        
        if [ $? -eq 0 ]; then
            echo "✅ $description completed successfully"
            return 0
        else
            echo "❌ $description failed, retrying..."
            retry=$((retry + 1))
            sleep 30
        fi
    done
    
    echo "💥 $description failed after $max_retries attempts"
    return 1
}

# Phase 1: Quick 7-day data (Priority)
echo "📊 Phase 1: Collecting 7-day pricing data (Priority)"
echo "Target: 2,000 API calls, ~2 hours"
echo ""

if check_timing; then
    run_with_retry "npm run ebay:robust -- --window 7 --budget 2000 --resume" "7-day data collection"
    
    if [ $? -eq 0 ]; then
        echo "🎉 Phase 1 Complete! 7-day data ready for analysis"
        echo "📈 You can now use the analysis page with current pricing"
        echo ""
        
        # Check if we should continue to Phase 2
        current_hour=$(date +%H)
        if [ $current_hour -ge 20 ] || [ $current_hour -le 6 ]; then
            echo "🌙 Good time for Phase 2 (30-day data)"
            echo "📊 Phase 2: Collecting 30-day pricing data"
            echo "Target: 3,000 API calls, ~4 hours"
            echo ""
            
            run_with_retry "npm run ebay:robust -- --window 30 --budget 3000 --resume" "30-day data collection"
            
            if [ $? -eq 0 ]; then
                echo "🎉 Phase 2 Complete! 30-day data ready"
                echo "📈 Trend analysis now available"
                echo ""
            fi
        else
            echo "⏰ Phase 2 scheduled for tonight (after 8 PM)"
            echo "💡 Run: npm run ebay:robust -- --window 30 --budget 3000 --resume"
        fi
    fi
else
    echo "⏰ Waiting for better timing to avoid rate limits"
    echo "💡 Try again in a few hours"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Check analysis page for 7-day data"
echo "2. Run Phase 2 tonight: npm run ebay:robust -- --window 30 --budget 3000 --resume"
echo "3. Run Phase 3 this weekend: npm run ebay:robust -- --window 90 --budget 5000 --resume"
echo ""
echo "🎯 Expected Timeline:"
echo "- Today: 7-day data (2 hours)"
echo "- Tonight: 30-day data (4 hours)" 
echo "- Weekend: 90-day data (6 hours)"
echo "- Total: Complete data in 2-3 days"

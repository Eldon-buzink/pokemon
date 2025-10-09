#!/bin/bash

echo "🔍 eBay Rate Limit Checker"
echo "========================="

while true; do
    echo "$(date): Checking rate limits..."
    
    # Test a single API call
    npx tsx -e "
    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.local' });
    
    async function check() {
        try {
            const response = await fetch('https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findCompletedItems&SERVICE-VERSION=1.13.0&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD=true&SECURITY-APPNAME=' + process.env.EBAY_APP_ID + '&keywords=pokemon&itemFilter(0).name=SoldItemsOnly&itemFilter(0).value=true&paginationInput.entriesPerPage=1');
            
            if (response.ok) {
                console.log('✅ Rate limits reset! Ready to collect data');
                process.exit(0);
            } else {
                console.log('❌ Rate limits still active');
                process.exit(1);
            }
        } catch (error) {
            console.log('❌ Error:', error.message);
            process.exit(1);
        }
    }
    
    check();
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "🎉 Rate limits have reset! Starting data collection..."
        npm run ebay:robust -- --window 7 --budget 2000 --resume
        break
    else
        echo "⏰ Rate limits still active, waiting 30 minutes..."
        sleep 1800  # Wait 30 minutes
    fi
done

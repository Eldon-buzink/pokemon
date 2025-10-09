#!/usr/bin/env tsx

import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config({ path: '.env.local' });

async function diagnoseEbay() {
  console.log('🔍 eBay API Diagnostic Tool');
  console.log('========================');
  
  const appId = process.env.EBAY_APP_ID;
  console.log('App ID:', appId);
  console.log('App ID Length:', appId?.length);
  console.log('App ID Format:', appId?.includes('SBX') ? 'Sandbox' : 'Production');
  
  // Test different endpoints
  const endpoints = [
    {
      name: 'Finding API (Sandbox)',
      url: 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1'
    },
    {
      name: 'Finding API (Production)',
      url: 'https://svcs.ebay.com/services/search/FindingService/v1'
    }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🧪 Testing ${endpoint.name}...`);
    
    try {
      const testUrl = `${endpoint.url}?OPERATION-NAME=findCompletedItems&SERVICE-VERSION=1.13.0&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD=true&SECURITY-APPNAME=${encodeURIComponent(appId!)}&keywords=pokemon&itemFilter(0).name=SoldItemsOnly&itemFilter(0).value=true&paginationInput.entriesPerPage=1`;
      
      const response = await fetch(testUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PokemonCardTracker/1.0'
        }
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS!');
        console.log('Response keys:', Object.keys(data));
        
        if (data.findCompletedItemsResponse) {
          const items = data.findCompletedItemsResponse[0]?.searchResult?.[0]?.item || [];
          console.log(`Found ${items.length} items`);
          if (items.length > 0) {
            console.log('First item title:', items[0].title?.[0]);
          }
        }
        break; // Stop testing if we find a working endpoint
      } else {
        const errorText = await response.text();
        console.log('❌ Error response:', errorText);
        
        // Parse error for specific issues
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.errorMessage) {
            const error = errorData.errorMessage[0]?.error[0];
            console.log('Error ID:', error?.errorId?.[0]);
            console.log('Error Message:', error?.message?.[0]);
            console.log('Error Domain:', error?.domain?.[0]);
          }
        } catch (e) {
          console.log('Could not parse error response');
        }
      }
    } catch (error) {
      console.log('❌ Network error:', (error as Error).message);
    }
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Check eBay Developer Console: https://developer.ebay.com/');
  console.log('2. Verify app status is "Active" or "Live"');
  console.log('3. Ensure Finding API is enabled');
  console.log('4. Check if app is in Sandbox or Production mode');
  console.log('5. Verify App ID matches exactly');
}

diagnoseEbay().catch(console.error);

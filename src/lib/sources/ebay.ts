// eBay Finding API client for completed/sold items
import { ebayLimiter, sleep, jitter } from '../rateLimiter';

const EBAY_FINDING_URL = process.env.EBAY_APP_ID?.includes('SBX') 
  ? "https://svcs.sandbox.ebay.com/services/search/FindingService/v1"
  : "https://svcs.ebay.com/services/search/FindingService/v1";
const APPID = process.env.EBAY_APP_ID!;

export type CompletedItem = {
  title: string;
  price: number;
  currency: string;
  endTime: string;
  url: string;
};

function buildUrl(params: Record<string, string>) {
  const u = new URL(EBAY_FINDING_URL);
  u.searchParams.set("OPERATION-NAME", "findCompletedItems");
  u.searchParams.set("SERVICE-VERSION", "1.13.0");
  u.searchParams.set("RESPONSE-DATA-FORMAT", "JSON");
  u.searchParams.set("REST-PAYLOAD", "true");
  u.searchParams.set("SECURITY-APPNAME", APPID);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}

async function fetchOnce(url: string, attempt = 1): Promise<any> {
  return ebayLimiter.schedule(async () => {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    
    if (res.status === 429) {
      // exponential backoff + jitter
      const wait = jitter(1000 * Math.pow(2, attempt), 0.5);
      if (attempt <= 4) { 
        await sleep(wait); 
        return fetchOnce(url, attempt + 1); 
      }
      throw new Error("eBay 429 after retries");
    }
    
    if (res.status >= 500) {
      const wait = jitter(800 * Math.pow(2, attempt), 0.5);
      if (attempt <= 4) { 
        await sleep(wait); 
        return fetchOnce(url, attempt + 1); 
      }
      throw new Error(`eBay ${res.status} after retries`);
    }
    
    if (!res.ok) throw new Error(`eBay ${res.status}`);
    
    const json = await res.json();
    // a little post-call jitter to avoid sync with other jobs
    await sleep(jitter(200, 0.7));
    return json;
  });
}

export async function findCompleted({
  query,
  categoryId,
  entriesPerPage = 100,
  pageNumber = 1,
  endTimeFrom,
  endTimeTo,
  soldOnly = true
}: {
  query: string;
  categoryId?: string;
  entriesPerPage?: number;
  pageNumber?: number;
  endTimeFrom?: string; // ISO
  endTimeTo?: string;   // ISO
  soldOnly?: boolean;
}): Promise<{ items: CompletedItem[]; totalPages: number; totalEntries: number; }> {
  const filters: string[] = [];
  if (soldOnly) {
    filters.push("itemFilter(0).name=SoldItemsOnly", "itemFilter(0).value=true");
  }
  if (endTimeFrom) filters.push(`itemFilter(1).name=EndTimeFrom`, `itemFilter(1).value=${encodeURIComponent(endTimeFrom)}`);
  if (endTimeTo) filters.push(`itemFilter(2).name=EndTimeTo`, `itemFilter(2).value=${encodeURIComponent(endTimeTo)}`);

  const url = buildUrl({
    "keywords": query,
    ...(categoryId ? { "categoryId": categoryId } : {}),
    "sortOrder": "EndTimeSoonest",
    "paginationInput.entriesPerPage": String(entriesPerPage),
    "paginationInput.pageNumber": String(pageNumber),
    ...Object.fromEntries(filters.map((f, i) => [String(100 + i), f])) // hack: tack on filters
  });

  const json = await fetchOnce(url);
  await sleep(1100);

  const ack = json?.findCompletedItemsResponse?.[0]?.ack?.[0];
  if (ack !== "Success") throw new Error("eBay ack != Success");

  const resp = json.findCompletedItemsResponse[0];
  const totalPages = Number(resp.paginationOutput?.[0]?.totalPages?.[0] ?? 1);
  const totalEntries = Number(resp.paginationOutput?.[0]?.totalEntries?.[0] ?? 0);
  const arr = (resp.searchResult?.[0]?.item ?? []) as any[];

  const items: CompletedItem[] = arr.map((it: any) => ({
    title: it.title?.[0] ?? "",
    price: Number(it.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ?? 0),
    currency: it.sellingStatus?.[0]?.currentPrice?.[0]?.["@currencyId"] ?? "USD",
    endTime: it.listingInfo?.[0]?.endTime?.[0] ?? "",
    url: it.viewItemURL?.[0] ?? ""
  })).filter(i => i.price > 0);

  return { items, totalPages, totalEntries };
}
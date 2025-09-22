// Quality guardrails and validation functions

export function isSuspiciousRatio(raw?: number | null, psa10?: number | null): boolean {
  if (!raw || !psa10) return false;
  const ratio = psa10 / raw;
  return ratio < 1.2 || ratio > 15; // modern sanity bounds; tune per era
}

export function pctDiff(a?: number | null, b?: number | null): number | null {
  if (!a || !b) return null;
  return (a - b) / b;
}

export function isValidPrice(price?: number | null): boolean {
  return typeof price === 'number' && price > 0 && price < 100000; // reasonable bounds
}

export function isValidPopulation(pop?: number | null): boolean {
  return typeof pop === 'number' && pop >= 0 && pop < 1000000; // reasonable bounds
}

export function validateCardData(data: {
  rawUsd?: number | null;
  psa10Usd?: number | null;
  psa10?: number | null;
  psa9?: number | null;
  total?: number | null;
}) {
  const issues: string[] = [];
  
  if (data.rawUsd && !isValidPrice(data.rawUsd)) {
    issues.push('Invalid raw price');
  }
  
  if (data.psa10Usd && !isValidPrice(data.psa10Usd)) {
    issues.push('Invalid PSA10 price');
  }
  
  if (isSuspiciousRatio(data.rawUsd, data.psa10Usd)) {
    issues.push('Suspicious price ratio');
  }
  
  if (data.psa10 && !isValidPopulation(data.psa10)) {
    issues.push('Invalid PSA10 population');
  }
  
  if (data.psa9 && !isValidPopulation(data.psa9)) {
    issues.push('Invalid PSA9 population');
  }
  
  if (data.total && !isValidPopulation(data.total)) {
    issues.push('Invalid total population');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

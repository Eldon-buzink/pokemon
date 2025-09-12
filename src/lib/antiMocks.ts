// src/lib/antiMocks.ts
if (process.env.NODE_ENV === 'production') {
  const forbidden = ['mock', 'generate-mock', 'celebrations-mock-data'];
  const stack = new Error().stack ?? '';
  if (forbidden.some(s => stack.includes(s))) {
    throw new Error('Mock artifacts detected in production build.');
  }
}
export {};

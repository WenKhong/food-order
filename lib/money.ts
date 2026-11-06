// Money is stored as integer cents (RM 28.90 is 2890) so totals never pick up
// floating-point errors. This turns cents into display text with integer maths
// only: 2890 -> "RM 28.90".
export function formatRM(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError(`formatRM expects a whole, non-negative number of cents, got ${cents}`);
  }
  const sen = cents % 100;
  const ringgit = (cents - sen) / 100; // exact: cents - sen is a multiple of 100
  return `RM ${ringgit.toLocaleString('en-MY')}.${String(sen).padStart(2, '0')}`;
}

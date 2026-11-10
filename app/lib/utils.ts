// ------------------------------------
// Date utilities
// ------------------------------------

// Local calendar date represented as Unix seconds.
// Normalize to local midnight to make streak comparisons reliable.
export function getToday(): number {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  return Math.floor(date.getTime() / 1000);
}

export function getYesterday(): number {
  return getToday() - 86400;
}
